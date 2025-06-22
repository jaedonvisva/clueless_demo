import React, { useEffect, useState } from "react"

type Note = {
  id: number
  title: string
  content: string
}

const NoteList = () => {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    fetch("http://localhost:8000/notes")
      .then((res) => res.json())
      .then(setNotes)
  }, [])

  return (
    <div>
      <h2>My Notes</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <strong>{note.title}</strong>: {note.content}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NoteList
