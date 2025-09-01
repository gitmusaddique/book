export interface ExportOptions {
  format: 'pdf' | 'html';
  pageSize: 'a4' | 'letter' | 'a5';
  includeTOC: boolean;
  includeCover: boolean;
  includePageNumbers: boolean;
  includeHeaders: boolean;
}

export async function exportBook(projectId: string, options: ExportOptions): Promise<Blob> {
  const response = await fetch(`/api/projects/${projectId}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error('Failed to export book');
  }

  return response.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
