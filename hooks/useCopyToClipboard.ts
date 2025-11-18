
import { useState, useCallback } from 'react';

type CopyStatus = 'inactive' | 'copied' | 'failed';

export const useCopyToClipboard = (): [(text: string) => void, CopyStatus] => {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('inactive');

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('inactive'), 2000);
      },
      () => {
        setCopyStatus('failed');
        setTimeout(() => setCopyStatus('inactive'), 2000);
      }
    );
  }, []);

  return [copy, copyStatus];
};
