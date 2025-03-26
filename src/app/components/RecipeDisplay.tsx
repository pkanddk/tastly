{/* Recipe Content */}
<div className="mt-6 recipe-content" dangerouslySetInnerHTML={{ __html: formattedMarkdown }} />

{/* View Original Recipe link */}
{url && (
  <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col items-center">
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-2"
    >
      View Original Recipe
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  </div>
)} 