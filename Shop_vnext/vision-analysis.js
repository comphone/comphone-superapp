// vision-analysis.js — Image Analysis for Comphone Technicians
// ใช้ Qwen-VL (OpenRouter free) วิเคราะห์รูปงาน

const VISION_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODEL = 'qwen/qvq-72b-preview'; // Free vision model

/**
 * วิเคราะห์รูปภาพงานจากช่าง
 * @param {string} imageBase64 - รูป base64
 * @param {string} context - บริบทงาน (ชื่อลูกค้า, อาการ)
 * @returns {object} { location_type, problem, installation_points, phase, recommendation }
 */
async function analyzeWorkImage(imageBase64, context) {
  const prompt = `คุณเป็นผู้เชี่ยวชาญ CCTV และระบบเครือข่าย วิเคราะห์รูปภาพงานจากช่างคอมโฟน

บริบทงาน: ${context || 'ไม่ระบุ'}

วิเคราะห์และตอบกลับเป็น JSON เท่านั้น (ไม่มี markdown):
{
  "location_type": "ประเภทสถานที่ (โรงเรียน, บ้าน, โรงงาน, ออฟฟิศ, วัด, ร้านค้า)",
  "problem_found": "ปัญหาหรือสิ่งที่สังเกตเห็น (ถ้ามี)",
  "installation_points": ["จุดที่ 1: ตำแหน่ง, จุดที่ 2: ตำแหน่ง, ...],
  "recommended_phase": "00_สำรวจ หรือ 01_ติดตั้ง หรือ 02_เสร็จสมบูรณ์ หรือ 03_MA_ซ่อมบำรุง",
  "issues": ["ปัญหาที่พบเช่น สายห้อย, ต้นไม้บัง, ไม่มีปลั๊ก"],
  "recommendations": ["คำแนะนำการติดตั้ง"],
  "estimated_effort": "ง่าย/ปานกลาง/ยาก",
  "confidence": 0-1
}

ตอบ JSON อย่างเดียว ไม่มีข้อความอื่น:`;

  try {
    const https = require('https');
    
    const postData = JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: 'text', text: prompt }
        ]
      }],
      max_tokens: 1000,
      temperature: 0.3
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
          'HTTP-Referer': 'https://comphones101.win',
          'X-Title': 'Comphone AI',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            const content = result.choices?.[0]?.message?.content || '';
            
            // Parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[0]));
            } else {
              resolve({ error: 'Invalid response format', raw: content });
            }
          } catch (e) {
            resolve({ error: 'Parse error', raw: data?.substring(0, 500) });
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  } catch (e) {
    return { error: 'API call failed: ' + e.message };
  }
}

/**
 * สร้างสรุปผลการวิเคราะห์เป็นภาษาไทย
 */
function formatAnalysisResult(analysis, jobId) {
  if (analysis.error) {
    return `⚠️ วิเคราะห์ภาพไม่สำเร็จ: ${analysis.error}`;
  }

  const emoji = {
    '00_สำรวจ': '🔍',
    '01_ติดตั้ง': '🔧',
    '02_เสร็จสมบูรณ์': '✅',
    '03_MA_ซ่อมบำรุง': '🛠️'
  };

  let msg = `📊 วิเคราะห์ภาพงาน ${jobId}\n\n`;
  msg += `📍 สถานที่: ${analysis.location_type || '-'}\n`;
  msg += `${emoji[analysis.recommended_phase] || '📋'} Phase: ${analysis.recommended_phase || '00_สำรวจ'}\n`;
  msg += `📊 ความยาก: ${analysis.estimated_effort || '-'}\n\n`;

  if (analysis.issues?.length > 0) {
    msg += `⚠️ ปัญหาที่พบ:\n${analysis.issues.map(i => `• ${i}`).join('\n')}\n\n`;
  }

  if (analysis.recommendations?.length > 0) {
    msg += `💡 คำแนะนำ:\n${analysis.recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
  }

  if (analysis.installation_points?.length > 0) {
    msg += `📸 จุดติดตั้ง:\n${analysis.installation_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
  }

  return msg;
}

/**
* Quick phase detection (lightweight, no API)
 * ใช้ pattern matching เพื่อระบุ Phase เบื้องต้น
*/
function quickPhaseDetect(imageBase64) {
  // Default = สำรวจ (safe default)
  return {
    recommended_phase: '00_สำรวจ',
    confidence: 0.3,
    note: 'ใช้ quickPhase — จะวิเคราะห์ละเอียดด้วย AI เมื่อ API พร้อม'
  };
}

module.exports = { analyzeWorkImage, formatAnalysisResult, quickPhaseDetect };