import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addBook, updateBookProgress, addNote, updateBookStatus } from './db';
import { Plus, BookOpen, Quote, ChevronLeft, Camera, Settings, Database, MoreVertical, Trash2, PenLine, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CoverGenerator from './components/CoverGenerator';
import Scanner from './components/Scanner';

const App = () => {
  const [view, setView] = useState('shelf'); // 'shelf', 'details', 'scanner'
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', totalPages: '' });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [manualNote, setManualNote] = useState({ content: '', page: '', tags: '' });
  const [activeShelf, setActiveShelf] = useState('reading'); // 'reading', 'completed'

  const books = useLiveQuery(() => db.books.toArray());
  const selectedBook = useLiveQuery(
    () => selectedBookId ? db.books.get(selectedBookId) : null,
    [selectedBookId]
  );
  const notes = useLiveQuery(
    () => selectedBookId ? db.notes.where('bookId').equals(selectedBookId).reverse().sortBy('date') : [],
    [selectedBookId]
  );

  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!newBook.title || !newBook.totalPages) return;
    await addBook({
      ...newBook,
      totalPages: parseInt(newBook.totalPages),
      currentPage: 0,
      status: 'reading'
    });
    setNewBook({ title: '', author: '', totalPages: '' });
    setShowAddModal(false);
  };

  const handleUpdateProgress = async (id, pages) => {
    await updateBookProgress(id, parseInt(pages));
  };

  const handleSaveManualNote = async (e) => {
    e.preventDefault();
    if (!manualNote.content) return;
    await addNote({
      bookId: selectedBookId,
      content: manualNote.content,
      page: parseInt(manualNote.page) || selectedBook.currentPage,
      tags: manualNote.tags,
      type: 'note'
    });
    setManualNote({ content: '', page: '', tags: '' });
    setShowNoteModal(false);
  };

  const handleDeleteBook = async (id) => {
    if (confirm('Czy na pewno chcesz usunąć tę książkę i wszystkie jej notatki?')) {
      await db.books.delete(id);
      await db.notes.where('bookId').equals(id).delete();
      setView('shelf');
    }
  };

  const handleFinishBook = async (id) => {
    if (confirm('Zakończyłeś lekturę? Gratulacje! Książka zostanie przeniesiona do archiwum.')) {
      await updateBookStatus(id, 'completed');
      await updateBookProgress(id, selectedBook.totalPages);
      setView('shelf');
    }
  };

  const lastReadBook = books?.filter(b => b.status === 'reading').sort((a,b) => new Date(b.startDate) - new Date(a.startDate))[0];
  const displayedBooks = books?.filter(b => b.status === activeShelf) || [];
  const completedCount = books?.filter(b => b.status === 'completed').length || 0;

  return (
    <div className="container">
      <AnimatePresence mode="wait">
        {view === 'shelf' && (
          <motion.div
            key="shelf"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Header / Widget */}
            <div className="card glass" style={{ marginTop: '20px', padding: '24px' }}>
              <div className="flex-between">
                <div>
                  <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Witaj, czytelniku</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Twoja biblioteka jest gotowa.</p>
                </div>
                <Database size={24} style={{ opacity: 0.5 }} onClick={() => setView('settings')} />
              </div>

              {lastReadBook && (
                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <CoverGenerator title={lastReadBook.title} author={lastReadBook.author} size="sm" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase' }}>Ostatnio czytane</p>
                      <h3 style={{ fontSize: '18px', margin: '4px 0' }}>{lastReadBook.title}</h3>
                      <div className="progress-container">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${(lastReadBook.currentPage / lastReadBook.totalPages) * 100}%` }} 
                        />
                      </div>
                      <p style={{ fontSize: '12px', opacity: 0.6 }}>Str. {lastReadBook.currentPage} z {lastReadBook.totalPages}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div style={{ margin: '32px 0' }}>
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <h3 
                    onClick={() => setActiveShelf('reading')}
                    style={{ fontSize: '20px', cursor: 'pointer', opacity: activeShelf === 'reading' ? 1 : 0.4 }}
                  >Czytane</h3>
                  <h3 
                    onClick={() => setActiveShelf('completed')}
                    style={{ fontSize: '20px', cursor: 'pointer', opacity: activeShelf === 'completed' ? 1 : 0.4 }}
                  >Ukończone <span style={{fontSize:'12px', opacity: 0.8}}>({completedCount})</span></h3>
                </div>
                <span style={{ fontSize: '14px', opacity: 0.6 }}>{displayedBooks.length}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {displayedBooks.map(book => (
                  <motion.div 
                    key={book.id} 
                    className="card" 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedBookId(book.id);
                      setView('details');
                    }}
                    style={{ padding: '12px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      <CoverGenerator title={book.title} author={book.author} size="md" />
                    </div>
                    <h4 style={{ fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</h4>
                    <p style={{ fontSize: '12px', opacity: 0.6 }}>{book.author}</p>
                    <div className="progress-container" style={{ margin: '8px 0 4px' }}>
                      <div 
                        className="progress-bar" 
                        style={{ width: `${(book.currentPage / book.totalPages) * 100}%` }} 
                      />
                    </div>
                  </motion.div>
                ))}
                
                <motion.div 
                  className="card" 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddModal(true)}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '240px',
                    border: '2px dashed var(--border-color)',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={32} style={{ opacity: 0.3 }} />
                  <p style={{ opacity: 0.5, marginTop: '12px' }}>Dodaj nową</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'details' && selectedBook && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex-between" style={{ padding: '20px 0' }}>
              <button onClick={() => setView('shelf')}><ChevronLeft size={28} /></button>
              <h3 className="serif">{selectedBook.title}</h3>
              <div>
                {selectedBook.status === 'reading' && (
                  <button onClick={() => handleFinishBook(selectedBook.id)} style={{ marginRight: '16px', color: 'var(--accent-primary)' }}>
                    <CheckCircle2 size={24} />
                  </button>
                )}
                <button onClick={() => handleDeleteBook(selectedBook.id)}><Trash2 size={24} style={{ opacity: 0.5 }} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
              <CoverGenerator title={selectedBook.title} author={selectedBook.author} size="lg" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontSize: '14px', opacity: 0.6 }}>Autor: {selectedBook.author}</p>
                <div style={{ margin: '20px 0' }}>
                  <p style={{ fontSize: '14px', marginBottom: '8px' }}>Postęp: {Math.round((Number(selectedBook.currentPage) / Number(selectedBook.totalPages)) * 100)}%</p>
                  <input 
                    type="range" 
                    min="0" 
                    max={Number(selectedBook.totalPages)} 
                    value={Number(selectedBook.currentPage)}
                    onChange={(e) => handleUpdateProgress(selectedBook.id, e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  />
                  <div className="flex-between" style={{ marginTop: '8px' }}>
                     <p style={{ fontSize: '12px', opacity: 0.6 }}>Strona {Number(selectedBook.currentPage)} z {Number(selectedBook.totalPages)}</p>
                     <p style={{ fontSize: '12px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                       {selectedBook.currentPage > 10 && selectedBook.startDate ? (
                         <>
                           ⏱️ {
                             Math.ceil((selectedBook.totalPages - selectedBook.currentPage) / 
                             (selectedBook.currentPage / Math.max(1, (new Date() - new Date(selectedBook.startDate)) / (1000 * 60 * 60 * 24))))
                           } dni do końca
                         </>
                       ) : 'Czytaj dalej, by poznać tempo...'}
                     </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '20px' }}>Moje notatki</h3>
                  <button 
                    onClick={() => {
                      setManualNote({ ...manualNote, page: selectedBook.currentPage });
                      setShowNoteModal(true);
                    }}
                    style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}
                  >
                    <PenLine size={20} />
                  </button>
                </div>
                <span className="serif" style={{ fontStyle: 'italic', opacity: 0.5 }}>{notes?.length || 0} fragmentów</span>
              </div>

              {notes?.map(note => (
                <div key={note.id} className="card" style={{ background: 'var(--bg-primary)', border: 'none' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', opacity: 0.5, fontWeight: 600 }}>STR. {note.page}</span>
                    <span style={{ fontSize: '11px', opacity: 0.4 }}>{new Date(note.date).toLocaleDateString('pl-PL')}</span>
                  </div>
                  <p className="serif" style={{ fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    "{note.content}"
                  </p>
                  {note.tags && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      {note.tags.split(',').map(tag => (
                        <span key={tag} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: 'var(--border-color)', opacity: 0.7 }}>{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {notes?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3 }}>
                  <Quote size={48} style={{ marginBottom: '16px' }} />
                  <p>Brak notatek dla tej książki.</p>
                  <p style={{ fontSize: '14px' }}>Użyj skanera, aby dodać pierwszy cytat.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {view === 'settings' && (
           <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             <div className="flex-between" style={{ padding: '20px 0' }}>
              <button onClick={() => setView('shelf')}><ChevronLeft size={28} /></button>
              <h3 className="serif">Ustawienia</h3>
              <div style={{ width: 28 }} />
            </div>
            
            <div className="card">
              <h3>Baza danych</h3>
              <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '20px' }}>Zabezpiecz swoją bibliotekę tworząc kopię zapasową.</p>
              
              <button 
                className="card" 
                style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', border: 'none' }}
                onClick={async () => {
                  const items = await db.books.toArray();
                  const notes = await db.notes.toArray();
                  const data = JSON.stringify({ books: items, notes });
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `moja_czytelnia_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                }}
              >
                Eksportuj Bibliotekę (JSON)
              </button>

              <button 
                className="card" 
                style={{ width: '100%', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'transparent' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = async (e) => {
                    const file = e.target.files[0];
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (data.books && data.notes) {
                      await db.books.clear();
                      await db.notes.clear();
                      await db.books.bulkAdd(data.books);
                      await db.notes.bulkAdd(data.notes);
                      alert('Import zakończony pomyślnie!');
                      window.location.reload();
                    }
                  };
                  input.click();
                }}
              >
                Importuj Bibliotekę
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {view !== 'scanner' && (
        <motion.button
          className="glass"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (view === 'details' && selectedBookId) {
              setView('scanner');
            } else {
              alert('Wybierz najpierw książkę z półki, aby dodać notatkę.');
            }
          }}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '64px',
            height: '64px',
            borderRadius: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            background: 'var(--accent-primary)',
            color: 'white'
          }}
        >
          <Camera size={32} />
        </motion.button>
      )}

      {/* Scanner View */}
      {view === 'scanner' && (
        <Scanner 
          bookId={selectedBookId} 
          onClose={() => setView('details')}
          currentPage={selectedBook?.currentPage}
        />
      )}

      {/* Add Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 1000, padding: '20px'
            }}
            onClick={() => setShowNoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{ width: '100%', maxWidth: '400px' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="serif" style={{ marginBottom: '20px' }}>Dodaj notatkę</h2>
              <form onSubmit={handleSaveManualNote}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>Treść notatki lub cytat</label>
                  <textarea 
                    className="card serif" 
                    style={{ width: '100%', padding: '12px', minHeight: '120px', resize: 'none' }} 
                    value={manualNote.content}
                    onChange={e => setManualNote({...manualNote, content: e.target.value})}
                    placeholder="Wpisz treść..."
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>Strona</label>
                    <input 
                      className="card" 
                      type="number"
                      style={{ width: '100%', padding: '12px' }} 
                      value={manualNote.page}
                      onChange={e => setManualNote({...manualNote, page: e.target.value})}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>Tagi</label>
                    <input 
                      className="card" 
                      style={{ width: '100%', padding: '12px' }} 
                      value={manualNote.tags}
                      onChange={e => setManualNote({...manualNote, tags: e.target.value})}
                      placeholder="np. ważne, cytat"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="card" 
                  style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, border: 'none' }}
                >
                  Zapisz notatkę
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{ width: '100%', maxWidth: '400px' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="serif" style={{ marginBottom: '20px' }}>Dodaj książkę</h2>
              <form onSubmit={handleAddBook}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>Tytuł</label>
                  <input 
                    className="card" 
                    style={{ width: '100%', padding: '12px', margin: 0 }} 
                    value={newBook.title}
                    onChange={e => setNewBook({...newBook, title: e.target.value})}
                    placeholder="Wpisz tytuł..."
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>Autor</label>
                  <input 
                    className="card" 
                    style={{ width: '100%', padding: '12px', margin: 0 }} 
                    value={newBook.author}
                    onChange={e => setNewBook({...newBook, author: e.target.value})}
                    placeholder="Wpisz autora..."
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>Liczba stron</label>
                  <input 
                    className="card" 
                    type="number"
                    style={{ width: '100%', padding: '12px', margin: 0 }} 
                    value={newBook.totalPages}
                    onChange={e => setNewBook({...newBook, totalPages: e.target.value})}
                    placeholder="np. 350"
                  />
                </div>
                <button 
                  type="submit"
                  className="card" 
                  style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, border: 'none' }}
                >
                  Dodaj do biblioteki
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
