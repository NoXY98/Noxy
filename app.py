import streamlit as st
import google.generativeai as genai
import yt_dlp
import os
import glob
import time
import json
import tempfile
import shutil
from pathlib import Path

# --- Configuration & Styling ---
st.set_page_config(
    page_title="OperaDNA Analyzer",
    page_icon="🎭",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Opera Aesthetic
st.markdown("""
<style>
    .stApp {
        background-color: #F5EFE0;
        color: #1A1A1A;
    }
    .main-header {
        font-family: 'Times New Roman', serif;
        color: #8E0000;
        text-align: center;
        font-size: 3.5rem;
        margin-bottom: 0;
    }
    .sub-header {
        font-family: 'Times New Roman', serif;
        color: #555;
        text-align: center;
        font-size: 1.2rem;
        font-style: italic;
        margin-bottom: 2rem;
    }
    .metric-container {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        border-top: 4px solid #8E0000;
        text-align: center;
    }
    .reasoning-box {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        border-left: 4px solid #D4AF37;
    }
    .context-box {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        border-left: 4px solid #1A1A1A;
        height: 100%;
    }
</style>
""", unsafe_allow_html=True)

# --- OperaDNA Databank ---
OPERA_DNA = {
  "Beijing Opera": {
    "instruments": ["Jinghu", "Erhu", "Yueqin", "Bangu", "Daluo"],
    "vocal_style": "High-pitched, nasal, falsetto (Dan), robust (Sheng)",
    "rhythm": "Xipi (lively), Erhuang (lyrical)",
    "regions": ["Beijing", "Northern China"],
    "description": "The quintessential Chinese opera form, known for its stylized action and distinct jinghu accompaniment."
  },
  "Kunqu": {
    "instruments": ["Bamboo Flute (Dizi)", "Sheng", "Pipa"],
    "vocal_style": "Melodic, soft, elongated, poetic",
    "rhythm": "Slow, flowing, syncopated",
    "regions": ["Suzhou", "Jiangsu"],
    "description": "One of the oldest forms, known as the 'mother of Chinese operas', emphasizing lyrical elegance."
  },
  "Cantonese Opera": {
    "instruments": ["Erhu", "Yangqin", "Saxophone", "Violin", "Gong"],
    "vocal_style": "Natural voice, wide range, vernacular Cantonese tones",
    "rhythm": "Variable, often incorporating western harmonic influence",
    "regions": ["Guangdong", "Hong Kong"],
    "description": "A vibrant regional style that readily absorbed Western instruments like the saxophone/violin in the early 20th century."
  }
}

SYSTEM_INSTRUCTION = f"""
You are an expert Musicologist specializing in Chinese Traditional Opera. 
Listen to the audio. Compare the acoustic features (timbre, rhythm, lead instrument) against the provided 'OperaDNA' JSON.

OperaDNA Databank:
{json.dumps(OPERA_DNA, indent=2)}

Instructions:
1. Classify the genre.
2. Explain your reasoning based on the databank.
3. Generate a 4-bar Bangu (Danpigu) percussion score that matches the audio's intensity, using this grid format:
Beat,1,2,3,4
Hand,X,D,k,.
(Legend: X=Ban/Clapper, D=Du/Hard, d=da/Soft, k=Kuang/Gong,.=Rest)

Output Format:
You must return a JSON object with the following schema. Ensure strict adherence to this JSON structure.
"""

# --- Helper Functions ---

def check_ffmpeg():
    """Checks if ffmpeg is installed and available in PATH."""
    return shutil.which('ffmpeg') is not None

def download_audio_from_youtube(url):
    """Downloads audio from YouTube using yt_dlp and returns the file path."""
    if not check_ffmpeg():
        st.error("❌ FFmpeg is not installed or not found in PATH. YouTube audio extraction requires FFmpeg.")
        return None

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
        temp_path = temp_file.name
    
    # yt_dlp configuration
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': temp_path,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'overwrites': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Check for file existence (yt_dlp sometimes adds extensions)
        final_path = temp_path
        if not os.path.exists(final_path):
             # Try finding any file starting with temp_path
             possible_files = glob.glob(temp_path + "*")
             if possible_files:
                 final_path = possible_files[0]
             else:
                 # Fallback for mp3 extension
                 final_path = temp_path + ".mp3"
        
        if os.path.exists(final_path):
            return final_path
        return None

    except Exception as e:
        st.error(f"Error downloading YouTube video: {e}")
        return None

def analyze_with_gemini(audio_path, mime_type, api_key):
    """Sends audio to Gemini for analysis."""
    try:
        genai.configure(api_key=api_key)
        
        with st.spinner("Uploading audio to Gemini..."):
            audio_file = genai.upload_file(path=audio_path, mime_type=mime_type)
            
        with st.spinner("Maestro is listening and analyzing..."):
            # Poll for file processing state
            while audio_file.state.name == "PROCESSING":
                time.sleep(2)
                audio_file = genai.get_file(audio_file.name)
                
            if audio_file.state.name == "FAILED":
                raise ValueError("Audio processing failed.")
                
            model = genai.GenerativeModel(
                model_name="gemini-3-pro-preview",
                system_instruction=SYSTEM_INSTRUCTION
            )
            
            # Define strict schema for output
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "OBJECT",
                    "properties": {
                        "genre": {"type": "STRING"},
                        "confidence": {"type": "NUMBER"},
                        "reasoning": {"type": "STRING"},
                        "banguScore": {"type": "STRING"},
                        "culturalContext": {"type": "STRING"}
                    },
                    "required": ["genre", "confidence", "reasoning", "banguScore", "culturalContext"]
                }
            }
            
            response = model.generate_content(
                [audio_file, "Analyze this audio based on the OperaDNA."],
                generation_config=generation_config
            )
            
            return json.loads(response.text)
            
    except Exception as e:
        st.error(f"Gemini Analysis Error: {e}")
        return None

# --- Sidebar ---
with st.sidebar:
    st.title("⚙️ Settings")
    
    # API Key Handling
    api_key = os.environ.get("API_KEY")
    if not api_key:
        st.error("⚠️ API_KEY missing!")
        st.markdown("Run with:")
        st.code("API_KEY=your_key streamlit run app.py", language="bash")
        st.stop()
    else:
        st.success("✅ API Key loaded")
        
    st.info(f"""
    **Environment:**
    - Model: `gemini-3-pro-preview`
    - FFmpeg: {"✅ Detected" if check_ffmpeg() else "❌ Missing"}
    """)
    
    st.markdown("---")
    st.markdown("### Supported Genres")
    st.markdown("- Beijing Opera\n- Kunqu\n- Cantonese Opera")

# --- Main Interface ---
st.markdown("<h1 class='main-header'>OperaDNA</h1>", unsafe_allow_html=True)
st.markdown("<p class='sub-header'>Traditional Chinese Opera Analyzer</p>", unsafe_allow_html=True)

# Input Method Tabs
tab1, tab2 = st.tabs(["📂 File Upload", "📺 YouTube Link"])

audio_source = None
mime_type = "audio/mp3"

with tab1:
    uploaded_file = st.file_uploader("Upload Audio (MP3/WAV)", type=["mp3", "wav"])
    if uploaded_file:
        # Save to temp file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.type.split('/')[-1]}") as tmp:
            tmp.write(uploaded_file.getvalue())
            audio_source = tmp.name
            mime_type = uploaded_file.type
        st.audio(uploaded_file, format=mime_type)

with tab2:
    yt_url = st.text_input("Paste YouTube URL")
    if yt_url:
        if st.button("Fetch Audio"):
            if not check_ffmpeg():
                 st.error("Please install FFmpeg to use the YouTube feature.")
            else:
                with st.spinner("Extracting audio from YouTube..."):
                    audio_source = download_audio_from_youtube(yt_url)
                    if audio_source:
                        st.success("Audio extracted successfully!")
                        st.audio(audio_source, format="audio/mp3")
                        mime_type = "audio/mp3"

# Analysis Trigger
if audio_source and st.button("Analyze Opera Style", type="primary", use_container_width=True):
    result = analyze_with_gemini(audio_source, mime_type, api_key)
    
    if result:
        # Display Results
        st.markdown("---")
        
        # Header Result
        col1, col2 = st.columns([1, 2])
        
        with col1:
             st.markdown(f"""
            <div class='metric-container'>
                <div style='color: #666; font-size: 0.9rem; letter-spacing: 2px;'>DETECTED GENRE</div>
                <div style='color: #8E0000; font-size: 2.5rem; font-family: "Noto Serif SC", serif; font-weight: bold;'>{result.get('genre')}</div>
                <div style='margin-top: 10px; background-color: #F5EFE0; padding: 5px; border-radius: 15px; display: inline-block; font-weight: bold; color: #D4AF37;'>
                    Confidence: {result.get('confidence')}%
                </div>
            </div>
            """, unsafe_allow_html=True)
            
        with col2:
            st.markdown(f"""
            <div class='reasoning-box'>
                <div style='font-size: 1.2rem; font-weight: bold; color: #1A1A1A; margin-bottom: 10px;'>🧐 Musical Reasoning</div>
                <div style='color: #444; line-height: 1.6;'>{result.get('reasoning')}</div>
            </div>
            """, unsafe_allow_html=True)
            
        st.markdown("<br>", unsafe_allow_html=True)
        
        col3, col4 = st.columns([1, 1])
        
        with col3:
             st.markdown(f"""
            <div class='context-box'>
                <div style='font-size: 1.2rem; font-weight: bold; color: #1A1A1A; margin-bottom: 10px;'>📜 Cultural Context</div>
                <div style='color: #444; font-style: italic;'>"{result.get('culturalContext')}"</div>
            </div>
            """, unsafe_allow_html=True)
            
        with col4:
            st.markdown("### 🥁 Bangu Percussion Score")
            st.code(result.get('banguScore'), language='text')
            st.caption("X=Clapper | D=Hard | d=Soft | k=Gong | .=Rest")
            
        # Cleanup temp file
        try:
            os.remove(audio_source)
        except:
            pass
