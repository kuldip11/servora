// Defense in depth. Every response also carries the fixed safety disclaimer.
export const needsStaff = (text: string) =>
  /allerg|peanut|groundnut|nut.free|gluten|celiac|coeliac|lactose|vegan|jain|halal|kosher|pregnan|diabet|ingredient|contain|safe|without|free.of|no\s+(nuts|milk|egg|onion|garlic)|एलर्जी|मूंगफली|जैन|वीगन|सामग्री|बिना|दूध|anda|moongfali|mungfali|lehsun|lahsun|pyaaz|pyaz/i.test(
    text,
  );

export const redactMessage = (text: string) =>
  text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, "[number removed]")
    .replace(/https?:\/\/\S+/gi, "[link removed]");
