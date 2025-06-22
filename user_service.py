from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/api/notes", methods=["GET"])
def get_notes():
    return jsonify([
        {"id": 1, "title": "First Note", "content": "This is a sample note."},
        {"id": 2, "title": "Second Note", "content": "This is another sample note."}
    ])

if __name__ == "__main__":
    app.run(debug=True)
