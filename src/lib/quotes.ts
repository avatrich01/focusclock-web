/** A different focus quote each day (deterministic by day-of-year). */
const QUOTES: { text: string; by: string }[] = [
  { text: "You don't have to be extreme, just consistent.", by: 'Focus rule #1' },
  { text: 'What gets scheduled gets done.', by: 'old desk note' },
  { text: 'One hour, one task. Repeat.', by: 'FocusClock' },
  { text: 'Done beats perfect. Just start the hour.', by: 'a recovering procrastinator' },
  { text: 'Your future is built in the next hour, not someday.', by: 'FocusClock' },
  { text: 'Discipline is choosing what you want most over what you want now.', by: 'Abraham Lincoln' },
  { text: 'The secret of getting ahead is getting started.', by: 'Mark Twain' },
  { text: 'Small hours, stacked daily, become a different life.', by: 'FocusClock' },
  { text: 'You will never always be motivated. Learn to be disciplined.', by: 'unknown' },
  { text: 'Protect your hours like they pay rent. They do.', by: 'FocusClock' },
  { text: 'Action is the antidote to overwhelm.', by: 'unknown' },
  { text: 'Win the hour, win the day.', by: 'FocusClock' },
  { text: 'Focus is saying no to a hundred good ideas.', by: 'Steve Jobs' },
  { text: 'Lock in. Everything you want is on the other side of the next task.', by: 'FocusClock' }
]

export function quoteOfDay(date: Date = new Date()): { text: string; by: string } {
  const start = new Date(date.getFullYear(), 0, 0).getTime()
  const doy = Math.floor((date.getTime() - start) / 86_400_000)
  return QUOTES[doy % QUOTES.length]
}
