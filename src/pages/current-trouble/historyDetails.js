export function parseHistoryDetails(details) {
  const parts = (details || '').split(' | ');
  let cause = '';
  let action = '';
  let classificationId = '';

  parts.forEach((part) => {
    if (part.startsWith('Cause:') || part.startsWith('Penyebab:')) {
      cause = part.replace('Cause:', '').replace('Penyebab:', '').trim();
    }

    if (part.startsWith('Last Action:') || part.startsWith('Action Terakhir:')) {
      action = part.replace('Last Action:', '').replace('Action Terakhir:', '').trim();
    }

    if (part.startsWith('Classification ID:') || part.startsWith('Klasifikasi ID:')) {
      classificationId = part
        .replace('Classification ID:', '')
        .replace('Klasifikasi ID:', '')
        .trim();
    }
  });

  return {
    cause,
    action,
    classificationId,
  };
}

