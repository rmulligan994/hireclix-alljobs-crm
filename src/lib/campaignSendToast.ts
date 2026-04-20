/** Shared copy for campaign send results (launch / send pending). */
export function buildCampaignLaunchDescription(errors: string[], skippedNoEmail: number): string {
  const chunks: string[] = [];
  if (skippedNoEmail > 0) {
    chunks.push(
      skippedNoEmail === 1
        ? 'One recipient has no email on file and was not sent.'
        : `${skippedNoEmail} recipients have no email on file and were not sent.`,
    );
  }
  if (errors.length > 0) {
    const allInvalid = errors.every((e) =>
      /no email|invalid|not a valid|Candidate has no email|no email on file/i.test(e),
    );
    if (allInvalid) {
      chunks.push(
        errors.length === 1
          ? 'One address could not be sent (missing or invalid).'
          : `${errors.length} addresses could not be sent (missing or invalid).`,
      );
    } else {
      chunks.push(`${errors.length} send(s) failed.`);
    }
  }
  return chunks.join(' ');
}

export function describeCampaignSendToast(data: {
  sent?: number;
  total?: number;
  errors?: string[];
  skippedNoEmail?: number;
}): string {
  const sent = data.sent ?? 0;
  const total = data.total ?? 0;
  const errors = Array.isArray(data.errors) ? data.errors : [];
  const skippedNoEmail = typeof data.skippedNoEmail === 'number' ? data.skippedNoEmail : 0;
  const prefix = `Sent ${sent} of ${total} emails successfully.`;
  const hint = buildCampaignLaunchDescription(errors, skippedNoEmail);
  return hint ? `${prefix} ${hint}` : prefix;
}
