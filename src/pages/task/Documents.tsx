export const Documents = ({ documents }: { documents: Record<string, any>[] }) => {
  if (!documents.length) {
    return null
  }

  return (
    <div class="card documents-card">
      <div class="card-title">Documents</div>
      <div class="doc-grid">
        {documents.map((doc) => (
          <a class="doc-item" href={doc.url} target="_blank" rel="noreferrer">
            <span class="doc-icon">📄</span>
            <span class="doc-name">{doc.name}</span>
            <span class="doc-subtitle">{doc.type}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
