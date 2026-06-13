'use client'

import { useState } from 'react'

export default function DownloadPDFButton({ fileUrl }: { fileUrl: string | null }) {
  const [noFile, setNoFile] = useState(false)

  function handleDownload() {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    } else {
      setNoFile(true)
      setTimeout(() => setNoFile(false), 3000)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleDownload} className="btn-outline text-sm">
        Download PDF
      </button>
      {noFile && (
        <p className="text-xs text-status-red">File not available.</p>
      )}
    </div>
  )
}
