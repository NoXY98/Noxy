import { OperaDNADatabank } from './types';

export const OPERA_DNA: OperaDNADatabank = {
  "Beijing Opera": {
    "instruments": ["Jinghu (High-pitched two-string fiddle)", "Bangu (high pitch clack)", "Daluo (Big Gong)", "Erhu", "Yueqin"],
    "vocal_style": "Nasal, falsetto (Dan) or Resonant/Guttural (Jing). Rigid pronunciation (Zhongzhou rhyme).",
    "rhythm": "Banshi system: Manban (4/4, slow), Yuanban (2/4, moderate), Liushui (1/4, fast). Sharp, dry attacks.",
    "regions": ["Beijing", "Northern China"],
    "description": "The quintessential Chinese opera form. Known for the piercing Jinghu and explosive Bangu conductor."
  },
  "Kunqu": {
    "instruments": ["Qudi (Bamboo Flute)", "Sheng", "Pipa"],
    "vocal_style": "Melismatic (many notes per syllable), refined, 'Water-polished tune' (Shuimodiao).",
    "rhythm": "Qupai system (Fixed tune matrices). Rhythm dictated by poetic meter. Slow and flowing.",
    "regions": ["Suzhou", "Jiangsu"],
    "description": "The 'Mother of Chinese operas'. Uses the bamboo flute as lead. Elegant, poetic, and soft."
  },
  "Cantonese Opera": {
    "instruments": ["Gaohu (held between knees)", "Yangqin", "Western Instruments (Violin, Saxophone, Cello)", "Gong", "Shaogu"],
    "vocal_style": "Natural voice, wide range, vernacular Cantonese tones. Variable voice production (Pinghou/Zihou).",
    "rhythm": "Highly syncopated. 'Lo Gu Dim' patterns often feature a distinct 'groove' or dance-like feel.",
    "regions": ["Guangdong", "Hong Kong"],
    "description": "A vibrant regional style known for absorbing Western instruments and using the Gaohu as lead."
  }
};

export const SYSTEM_INSTRUCTION = `
You are an expert Musicologist specializing in Chinese Traditional Opera. 
Listen to the audio. Compare the acoustic features (timbre, rhythm, lead instrument) against the provided 'OperaDNA' JSON.

OperaDNA Databank:
${JSON.stringify(OPERA_DNA, null, 2)}

Instructions:
1. Classify the genre.
2. Explain your reasoning based on the databank.
3. Generate a 4-bar Bangu (Danpigu) percussion score that matches the audio's intensity, using this grid format:
Beat,1,2,3,4
Hand,X,D,k,.
(Legend: X=Ban/Clapper, D=Du/Hard, d=da/Soft, k=Kuang/Gong,.=Rest)

Output Format:
You must return a JSON object with the following schema:
{
  "genre": "Name of Genre (Must match a key in OperaDNA)",
  "confidence": 0-100 (Integer),
  "reasoning": "Detailed musicological explanation referencing specific instruments and vocal qualities heard.",
  "banguScore": "The 4-bar percussion score in the requested grid format.",
  "culturalContext": "A brief historical fact about this specific style."
}
`;
