import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, X, Check, RefreshCw, Type, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addNote } from '../db';

const Scanner = ({ bookId, onClose, currentPage = 0 }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('camera'); // 'camera', 'preview', 'editor'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Nie można uruchomić aparatu. Sprawdź uprawnienia.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth > 0) {
      // Calculate crop area based on visually drawn rectangle (80% width, 30% height centered)
      const cropWidth = video.videoWidth * 0.8;
      const cropHeight = video.videoHeight * 0.3;
      const startX = (video.videoWidth - cropWidth) / 2;
      const startY = (video.videoHeight - cropHeight) / 2;

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw only the cropped portion from the video stream
      ctx.drawImage(
        video,
        startX, startY, cropWidth, cropHeight, // source rect
        0, 0, cropWidth, cropHeight // destination rect
      );
      
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
      setStep('preview');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const processOCR = async () => {
    setIsProcessing(true);
    setStep('editor');
    try {
      const worker = await createWorker('pol');
      const { data: { text } } = await worker.recognize(capturedImage);
      // Basic cleanup: remove extra newlines and weird chars
      const cleaned = text.replace(/\n\s*\n/g, '\n').replace(/\n/g, ' ').trim();
      setOcrText(cleaned);
      await worker.terminate();
    } catch (err) {
      console.error("OCR error:", err);
      setOcrText("Błąd rozpoznawania tekstu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    const page = prompt("Na której stronie jest ten cytat?", currentPage);
    const tags = prompt("Tagi (opcjonalnie, po przecinku)?", "");
    
    await addNote({
      bookId,
      content: ocrText,
      page: parseInt(page) || currentPage,
      tags: tags || "",
      type: 'quote'
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="flex-between" style={{ padding: '16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={onClose}><X size={24} /></button>
        <h3 className="serif">Skaner Cytatów</h3>
        <div style={{ width: 24 }} />
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {step === 'camera' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ 
              position: 'absolute', 
              top: '50%', left: '50%', 
              transform: 'translate(-50%, -50%)',
              width: '80%', height: '30%',
              border: '2px solid white',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              borderRadius: '8px'
            }} />
            <button 
              onClick={capturePhoto}
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'white',
                border: '5px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <img src={capturedImage} style={{ width: '80%', borderRadius: '8px', border: '2px solid white' }} />
            <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
              <button 
                className="card" 
                onClick={() => setStep('camera')}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px' }}
              >
                Ponów
              </button>
              <button 
                className="card" 
                onClick={processOCR}
                style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 600 }}
              >
                Przetwórz tekst
              </button>
            </div>
          </div>
        )}

        {step === 'editor' && (
          <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {isProcessing ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '20px' }} />
                <p>Rozpoznawanie tekstu...</p>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>Edytuj rozpoznany cytat:</label>
                <textarea 
                  className="card serif"
                  style={{ flex: 1, width: '100%', padding: '16px', fontSize: '18px', resize: 'none' }}
                  value={ocrText}
                  onChange={e => setOcrText(e.target.value)}
                />
                <button 
                  className="card" 
                  onClick={handleSave}
                  style={{ marginTop: '20px', background: 'var(--accent-primary)', color: 'white', padding: '16px', fontWeight: 600, border: 'none' }}
                >
                  Zapisz cytat
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </motion.div>
  );
};

export default Scanner;
