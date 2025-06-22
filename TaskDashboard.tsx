import React, { useEffect, useState } from "react"

interface Note {
  id: number
  title: string
  content: string
}

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    fetch("/api/notes")
      .then((res) => res.json())
      .then((data) => setNotes(data))
  }, [])

  return (
    <div>
      <h1>My Notes</h1>
      {notes.map((note) => (
        <div key={note.id}>
          <h2>{note.title}</h2>
          <p>{note.content}</p>
        </div>
      ))}
    </div>
  )
}

export default NotesPage
