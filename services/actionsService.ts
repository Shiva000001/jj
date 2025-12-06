const jokes = [
  "Why is a marriage like a public toilet? The ones outside are desperate to get in, and the ones inside are desperate to get out.",
  "Ek ladka ladki ko ched raha tha. Ladki: 'Bhaiya, aapki behen nahi hai kya?' Ladka: 'Hai, par abhi ghar pe hai... aap free ho kya?'",
  "Patient: 'Doctor, main har cheez bhool jaata hoon.' Doctor: 'Aisa kab se ho raha hai?' Patient: 'Kya kab se ho raha hai?'",
  "A man asks a farmer, 'Why is your bull running so fast?' The farmer replies, 'He sees you're holding two red flags.' The man says, 'But I'm not!' The farmer says, 'Yeah, but the bull doesn't know that.'",
];

export const playSongOnYoutube = (query: string): string => {
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  window.open(youtubeSearchUrl, '_blank');
  return `Searching YouTube for "${query}".`;
};

export const searchWeb = (query: string): string => {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(googleSearchUrl, '_blank');
    return `Searching Google for "${query}".`;
};

export const setAlarm = (delayInSeconds: number, label: string = 'Alarm'): string => {
  if (typeof delayInSeconds !== 'number' || delayInSeconds <= 0) {
    return "I can only set alarms for a positive number of seconds.";
  }
  
  setTimeout(() => {
    alert(`ALARM: ${label}`);
  }, delayInSeconds * 1000);

  const minutes = Math.floor(delayInSeconds / 60);
  const seconds = delayInSeconds % 60;
  let timeString = "";
  if (minutes > 0) {
    timeString += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  if (seconds > 0) {
    if (minutes > 0) timeString += " and ";
    timeString += `${seconds} second${seconds > 1 ? 's' : ''}`;
  }


  return `OK, I've set an alarm for "${label}" to go off in ${timeString || (delayInSeconds + ' seconds')}.`;
};

export const makePhoneCall = (contact: string): string => {
    return `I am a web-based assistant and cannot make real phone calls. But if I could, I'd be calling ${contact} right now!`;
};

export const getCurrentTime = (): string => {
    return `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
};

export const tellJoke = (): string => {
    return jokes[Math.floor(Math.random() * jokes.length)];
};