import Dexie from 'dexie';

export const db = new Dexie('MojaCzytelniaDB');

db.version(1).stores({
  books: '++id, title, author, totalPages, currentPage, status, startDate, finishDate',
  notes: '++id, bookId, content, page, date, type, tags'
});

// Helper functions for common database operations
export async function addBook(book) {
  return await db.books.add({
    ...book,
    status: book.status || 'reading',
    currentPage: book.currentPage || 0,
    startDate: new Date().toISOString()
  });
}

export async function addNote(note) {
  return await db.notes.add({
    ...note,
    date: new Date().toISOString()
  });
}

export async function updateBookProgress(id, page) {
  return await db.books.update(id, { currentPage: page });
}

export async function updateBookStatus(id, status) {
  const updateData = { status };
  if (status === 'completed') {
    updateData.finishDate = new Date().toISOString();
  }
  return await db.books.update(id, updateData);
}

export async function getBookNotes(bookId) {
  return await db.notes.where('bookId').equals(bookId).reverse().sortBy('date');
}
