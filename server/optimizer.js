const instruction = `Bạn là biên tập viên prompt. Hãy viết lại prompt người dùng thành một prompt rõ ràng, dễ dùng ngay trên các nền tảng AI.
Giữ nguyên mục đích, ngôn ngữ, dữ kiện, tên riêng, yêu cầu và ràng buộc của bản gốc. Không tự bịa thông tin, không tự thêm vai trò hoặc định dạng đầu ra nếu không giúp làm rõ yêu cầu. Nếu thiếu dữ liệu cần thiết, dùng chỗ trống [điền thông tin] ngắn gọn thay vì đoán.
Trả về duy nhất prompt đã tối ưu, không giải thích, không nhận xét, không thêm tiêu đề hoặc dấu Markdown.`;

const problem = (message,status) => Object.assign(Error(message),{status});

export async function optimizePrompt(input,fetcher=fetch){
  const draft=input?.prompt;
  if(typeof draft!=='string'||draft.trim().length<10||draft.length>6000)
    throw problem('Prompt cần dài từ 10 đến 6.000 ký tự.',400);
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)throw problem('Chức năng tối ưu chưa được cấu hình Gemini API key trên Render.',503);
  const model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
  if(!/^[a-z0-9.-]+$/.test(model))throw problem('Tên mô hình Gemini không hợp lệ.',500);
  let response;
  try{
    response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
      body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:draft.trim()}]}],generationConfig:{maxOutputTokens:2048}}),
      signal:AbortSignal.timeout(45000)
    });
  }catch{throw problem('Không kết nối được Gemini. Vui lòng thử lại.',504);}
  if(response.status===429)throw problem('Gemini đang giới hạn lượt dùng. Vui lòng thử lại sau.',429);
  if(!response.ok)throw problem('Gemini chưa xử lý được yêu cầu. Hãy kiểm tra API key và hạn mức trên Google AI Studio.',502);
  let data;
  try{data=await response.json();}catch{throw problem('Phản hồi từ Gemini không hợp lệ.',502);}
  const optimized=(data.candidates?.[0]?.content?.parts||[]).map(part=>part.text||'').join('').trim();
  if(!optimized)throw problem('Gemini chưa trả về prompt. Hãy thử nội dung khác.',502);
  return {optimized:optimized.slice(0,12000),model};
}
