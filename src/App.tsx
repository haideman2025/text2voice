import React, { useState, useEffect } from 'react';
import { Volume2, Play, Download, Loader2, BookOpen, Upload, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSpeech, enhanceTextForSpeech, transcribeAudio, VoiceName } from './services/geminiTts';
import { pcmBase64ToWavUrl } from './lib/audioUtils';

const VOICES: { id: VoiceName; name: string; category: string; description: string; useCase: string }[] = [
  { id: 'Aoede', name: 'Aoede', category: 'Giọng Nữ', description: 'Trầm ấm, truyền cảm', useCase: 'Học thuật' },
  { id: 'Kore', name: 'Kore', category: 'Giọng Nữ', description: 'Nhẹ nhàng, điềm tĩnh', useCase: 'Học thuật' },
  { id: 'Charon', name: 'Charon', category: 'Giọng Nam', description: 'Trầm, uy lực, chuyên sâu', useCase: 'Học thuật' },
  { id: 'Zephyr', name: 'Zephyr', category: 'Giọng Nữ', description: 'Tự nhiên, thanh thoát, thu hút', useCase: 'Quảng cáo' },
  { id: 'Puck', name: 'Puck', category: 'Giọng Nam', description: 'Sáng, năng động, tươi mới', useCase: 'Quảng cáo' },
  { id: 'Fenrir', name: 'Fenrir', category: 'Giọng Nam', description: 'Ấm áp, biểu cảm, thuyết phục', useCase: 'Quảng cáo' },
];

const LANGUAGES = [
  { id: 'vi', name: 'Tiếng Việt' },
  { id: 'en', name: 'Tiếng Anh (English)' },
  { id: 'fr', name: 'Tiếng Pháp (Français)' },
  { id: 'ja', name: 'Tiếng Nhật (日本語)' },
  { id: 'ko', name: 'Tiếng Hàn (한국어)' },
  { id: 'zh', name: 'Tiếng Trung (中文)' },
];

export default function App() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<VoiceName>('Aoede');
  const [language, setLanguage] = useState('vi');
  const [useCaseFilter, setUseCaseFilter] = useState<'All' | 'Học thuật' | 'Quảng cáo'>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'synthesizing'>('idle');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhanceIntonation, setEnhanceIntonation] = useState(false);
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setIsSettingsOpen(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("File âm thanh quá lớn. Vui lòng chọn file gọn hơn 20MB.");
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      const transcription = await transcribeAudio(base64String, file.type, language);
      if (transcription) {
        setText(prev => prev ? prev + '\n\n' + transcription : transcription);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi phân tích audio.');
    } finally {
      setIsTranscribing(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    setGenerationStep('synthesizing');
    setError(null);
    setAudioUrl(null);
    setEnhancedText(null);
    
    try {
      let finalContentToSpeak = text;
      
      if (enhanceIntonation) {
        setGenerationStep('analyzing');
        finalContentToSpeak = await enhanceTextForSpeech(text, language);
        setEnhancedText(finalContentToSpeak);
        setGenerationStep('synthesizing');
      }

      const base64Audio = await generateSpeech(finalContentToSpeak, voice);
      if (base64Audio) {
        const url = pcmBase64ToWavUrl(base64Audio);
        setAudioUrl(url);
      } else {
        setError('Failed to generate audio. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsLoading(false);
      setGenerationStep('idle');
    }
  };

  const wordCount = text.split(/\s+/).filter(w => w).length;
  const filteredVoices = VOICES.filter(v => useCaseFilter === 'All' || v.useCase === useCaseFilter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <nav className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
            VoxAcademia
          </span>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Main Content Area: Input */}
        <section className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                    type="file" 
                    id="audio-upload"
                    className="hidden" 
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    disabled={isTranscribing || isLoading}
                />
                <label 
                    htmlFor="audio-upload" 
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                      ${isTranscribing || isLoading 
                        ? 'text-slate-400 bg-slate-100 cursor-not-allowed' 
                        : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 cursor-pointer'
                      }
                    `}
                >
                    {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {isTranscribing ? 'Đang phân tích...' : 'Upload Audio script'}
                </label>
                <span className="text-xs font-medium text-slate-400 hidden sm:block">Soạn thảo văn bản học thuật</span>
              </div>
            </div>
            
            <textarea
              id="academic-text"
              className="flex-1 p-8 text-lg text-slate-700 leading-relaxed outline-none resize-none placeholder:text-slate-300"
              placeholder="Nhập văn bản học thuật của bạn tại đây để chuyển đổi thành giọng đọc chất lượng cao..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading || isTranscribing}
            />

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <div className="text-xs text-slate-400 font-medium">
                Số từ: {wordCount}
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={!text.trim() || isLoading}
                className={`
                  px-8 py-3 font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all
                  ${!text.trim() || isLoading 
                    ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.98]'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span>Tạo Audio Ngay</span>
                    <Play className="w-4 h-4 fill-current" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Config & Output */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
          {/* Voice Selection Panel */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800">Cấu hình giọng đọc</h3>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Ngôn ngữ
              </label>
              <div className="relative mb-4">
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.id} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>

              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Thể loại
              </label>
              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                {(['All', 'Học thuật', 'Quảng cáo'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setUseCaseFilter(type)}
                    className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${
                      useCaseFilter === type
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type === 'All' ? 'Tất cả' : type}
                  </button>
                ))}
              </div>

              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Chọn Giọng
              </label>
              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredVoices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`
                      text-left p-3 rounded-xl border transition-all text-sm
                      ${voice === v.id 
                        ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50 text-indigo-900 font-medium' 
                        : 'border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-slate-100 text-slate-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{v.name}</span>
                      {voice === v.id && <Volume2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-normal">
                      <span>{v.description}</span>
                      <span className="bg-slate-200 text-slate-600 px-1.5 rounded">{v.category}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100">
                <button 
                  onClick={() => setEnhanceIntonation(!enhanceIntonation)}
                  className="flex items-center gap-3 cursor-pointer text-left w-full focus:outline-none"
                >
                  <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out flex-shrink-0 ${enhanceIntonation ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 ease-in-out ${enhanceIntonation ? 'translate-x-5' : 'translate-x-1'}`}></div>
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Phân tích & Thêm ngữ điệu (AI)
                  </span>
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Output Audio Panel */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex justify-between items-center">
              Nghe thử Audio
              {(isLoading || audioUrl) && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              )}
            </h3>

            <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
              <AnimatePresence mode="wait">
                {!audioUrl && !isLoading && (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-1">
                      <Volume2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Vui lòng nhấn Tạo Audio Ngay<br/>để nghe kết quả</p>
                  </motion.div>
                )}

                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <div className="text-xs text-indigo-700 font-medium animate-pulse">
                      {generationStep === 'analyzing' 
                        ? 'Đang phân tích & tối ưu ngữ điệu...' 
                        : 'Đang tổng hợp giọng đọc AI...'}
                    </div>
                  </motion.div>
                )}

                {audioUrl && !isLoading && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full flex flex-col gap-5 items-center"
                  >
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center shadow-inner relative">
                      <Volume2 className="w-7 h-7 text-indigo-600" />
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-200 animate-ping" style={{ animationDuration: '2.5s' }}></div>
                    </div>
                    
                    <audio 
                      controls 
                      className="w-full h-10" 
                      src={audioUrl} 
                      autoPlay
                    />
                    
                    <a
                      href={audioUrl}
                      download={`voxacademia_${voice.toLowerCase()}.wav`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors font-medium text-xs shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Tải Audio (WAV)
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-800">Cấu hình hệ thống</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Gemini API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                />
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Trường hợp key mặc định bị quá tải, bạn có thể nhập API Key riêng của bạn để sử dụng ứng dụng ổn định hơn. Hệ thống sẽ lưu key vào trình duyệt của bạn.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
                >
                  Lưu thiết lập
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

