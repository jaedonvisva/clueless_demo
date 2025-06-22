type Note = {
  id: number
  title: string
  content: string
}

function NoteList() {
  const notes: Note[] = [
    { id: 1, title: "Note 1", content: "Learn TypeScript" },
    { id: 2, title: "Note 2", content: "Build a project" }
  ]

  const container = document.createElement("div")

  const heading = document.createElement("h2")
  heading.textContent = "Notes"
  container.appendChild(heading)

  const ul = document.createElement("ul")

  notes.forEach((note) => {
    const li = document.createElement("li")
    li.innerHTML = `<strong>${note.title}</strong>: ${note.content}`
    ul.appendChild(li)
  })

  container.appendChild(ul)
  document.body.appendChild(container)
}

NoteList()
