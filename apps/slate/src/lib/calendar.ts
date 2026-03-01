/** Generate .ics content for adding booking to calendar */
export function createIcsContent(params: {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}): string {
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SLATE//Booking//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(params.start)}`,
    `DTEND:${formatDate(params.end)}`,
    `SUMMARY:${params.title.replace(/,/g, '\\,')}`,
    params.location ? `LOCATION:${params.location.replace(/,/g, '\\,')}` : null,
    params.description ? `DESCRIPTION:${params.description.replace(/,/g, '\\,')}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** Trigger download of .ics file */
export function downloadIcs(ics: string, filename = 'booking.ics') {
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
