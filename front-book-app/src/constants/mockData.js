import img1 from '../assets/1.png'
import img10 from '../assets/10.png'
import img2 from '../assets/2.png'
import img3 from '../assets/3.png'
import img4 from '../assets/4.png'
import img5 from '../assets/5.png'
import img6 from '../assets/6.png'
import img7 from '../assets/7.png'
import img8 from '../assets/8.png'
import img9 from '../assets/9.png'

const bookItems = [
  {
    id: 1,
    author: "robert c.martin",
    country: "United States",
    image: img1,
    is_favorite: false,
    language: "English",
    pages: 256,
    title: "clean coder",
    year: 2010,
  },
  {
    id: "002",
    author: "Hans Christian Andersen",
    country: "Denmark",
    image: img2,
    language: "Danish",
    link: "https://en.wikipedia.org/wiki/Fairy_Tales_Told_for_Children._First_Collection.\n",
    pages: 784,
    title: "Fairy tales",
    year: 1836,
  },
  {
    id: "003",
    author: "Dante Alighieri",
    country: "Italy",
    image: img3,
    language: "Italian",
    link: "https://en.wikipedia.org/wiki/Divine_Comedy\n",
    pages: 928,
    title: "The Divine Comedy",
    year: 1315,
  },
  {
    id: "004",
    author: "Maureen Gallery Kovacs",
    country: "Sumer and Akkadian Empire",
    image: img4,
    language: "Akkadian",
    link: "https://en.wikipedia.org/wiki/Epic_of_Gilgamesh\n",
    pages: 160,
    title: "The Epic Of Gilgamesh",
    year: -1700,
  },
  {
    id: "005",
    author: "Graham Ricardo",
    country: "Achaemenid Empire",
    image: img5,
    language: "Hebrew",
    link: "https://en.wikipedia.org/wiki/Book_of_Job\n",
    pages: 176,
    title: "The Book Of Job",
    year: -600,
  },
  {
    id: "006",
    author: "Hanan Al-Shaykh",
    country: "India/Iran/Iraq/Egypt/Tajikistan",
    image: img6,
    language: "Arabic",
    link: "https://en.wikipedia.org/wiki/One_Thousand_and_One_Nights\n",
    pages: 288,
    title: "One Thousand and One Nights",
    year: 1200,
  },
  {
    id: "007",
    author: "Robert Cook",
    country: "Iceland",
    image: img7,
    language: "English",
    link: "https://en.wikipedia.org/wiki/Nj%C3%A1ls_saga\n",
    pages: 384,
    title: "Nj\u00e1l's Saga",
    year: 1350,
  },
  {
    id: "008",
    author: "Jane Austen",
    country: "United Kingdom",
    image: img8,
    language: "English",
    link: "https://en.wikipedia.org/wiki/Pride_and_Prejudice\n",
    pages: 226,
    title: "Pride and Prejudice",
    year: 1813,
  },
  {
    id: "009",
    author: "Honor\u00e9 de Balzac",
    country: "France",
    image: img9,
    language: "French",
    link: "https://en.wikipedia.org/wiki/Le_P%C3%A8re_Goriot\n",
    pages: 443,
    title: "Le P\u00e8re Goriot",
    year: 1835,
  },
  {
    id: "010",
    author: "Samuel Beckett",
    country: "Republic of Ireland",
    image: img10,
    language: "French",
    link: "https://en.wikipedia.org/wiki/Molloy_(novel)\n",
    pages: 256,
    title: "Molloy, Malone Die",
    year: 1952,
  },
];

const bookDetails = {
  "1": {
    created_at: "2026-08-05T11:50:55.084153Z",
    description: "Readers will learn\r\n•    What it means to behave as a true software craftsman\r\n•    How to deal with conflict, tight schedules, and unreasonable managers\r\n•    How to get into the flow of coding, and get past writer's block\r\n•    How to handle unrelenting pressure and avoid burnout\r\n•    How to combine enduring attitudes with new development paradigms\r\n•    How to manage your time, and avoid blind alleys, marshes, bogs, and swamps\r\n•    How to foster environments where programmers and teams can thrive\r\n•    When to say No-and how to say it\r\n•    When to say Yes-and what yes really means",
    isbn: "978-0-13-7081",
    published_year: 2010,
    updated_at: "2026-08-05T11:50:55.084193Z",
  },
  "002": {
    createdAt: "2026-01-12T10:15:00.000Z",
    description: "A generous collection of timeless fairy tales with a soft, imaginative rhythm. It is ideal for readers who want wonder, nostalgia, and short stories that still feel alive.",
    isbn: "978-1-0000-0002-3",
    updatedAt: "2026-07-13T11:40:00.000Z",
  },
  "003": {
    createdAt: "2026-01-18T08:45:00.000Z",
    description: "A monumental journey through fear, judgment, beauty, and transformation. The Divine Comedy belongs on a detail page that feels ceremonial, layered, and unforgettable.",
    isbn: "978-1-0000-0003-0",
    updatedAt: "2026-07-14T13:10:00.000Z",
  },
  "004": {
    createdAt: "2026-01-22T12:05:00.000Z",
    description: "One of humanity's oldest surviving epics, shaped by friendship, glory, grief, and the search for meaning. It brings ancient scale into a modern reading experience.",
    isbn: "978-1-0000-0004-7",
    updatedAt: "2026-07-15T09:25:00.000Z",
  },
  "005": {
    createdAt: "2026-02-02T15:35:00.000Z",
    description: "A profound poetic meditation on suffering, faith, silence, and endurance. This edition is presented as a thoughtful classic for readers who want depth over noise.",
    isbn: "978-1-0000-0005-4",
    updatedAt: "2026-07-16T16:55:00.000Z",
  },
  "006": {
    createdAt: "2026-02-10T10:50:00.000Z",
    description: "A vivid world of nested tales, impossible turns, clever voices, and night-by-night suspense. It is built for readers who love storytelling as a living performance.",
    isbn: "978-1-0000-0006-1",
    updatedAt: "2026-07-17T10:05:00.000Z",
  },
  "007": {
    createdAt: "2026-02-18T13:45:00.000Z",
    description: "A saga of honor, feud, loyalty, and consequence, carrying the stark atmosphere of Icelandic storytelling. It fits readers who enjoy clean prose with heavy stakes.",
    isbn: "978-1-0000-0007-8",
    updatedAt: "2026-07-18T12:30:00.000Z",
  },
  "008": {
    createdAt: "2026-03-01T09:10:00.000Z",
    description: "A sharp, elegant novel of manners, judgment, wit, and emotional precision. Pride and Prejudice deserves a product page that feels refined without becoming cold.",
    isbn: "978-1-0000-0008-5",
    updatedAt: "2026-07-19T15:45:00.000Z",
  },
  "009": {
    createdAt: "2026-03-08T11:25:00.000Z",
    description: "A Parisian study of ambition, money, sacrifice, and social hunger. It gives the store a richly human classic with texture, tension, and literary weight.",
    isbn: "978-1-0000-0009-2",
    updatedAt: "2026-07-20T08:35:00.000Z",
  },
  "010": {
    createdAt: "2026-03-16T14:00:00.000Z",
    description: "A spare, strange, and darkly funny modern classic with a voice that refuses easy comfort. It is a detail-page candidate for readers looking for a harder edge.",
    isbn: "978-1-0000-0010-8",
    updatedAt: "2026-07-21T12:15:00.000Z",
  },
};

const books = bookItems.map((book) => ({
  ...book,
  ...bookDetails[book.id],
  publishedYear: book.year,
}));

export { books }
