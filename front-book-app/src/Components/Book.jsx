import { useEffect, useState } from 'react';
import { books as bookData } from '../constants/mockData';
import { apiRequest, getArrayPayload } from '../services/api';
import BookCard from './BookCard';
import styles from './Books.module.css';
import SearchBox from './SearchBox';
import SideCard from './SideCard';

const getFavoriteStatus = (book) => book.isFavorite ?? book.is_favorite;

function Book({ isBookFavorite = getFavoriteStatus, onOpenBook, onToggleFavorite }) {
	const [sourceBooks, setSourceBooks] = useState(bookData);
	const [books, setBooks] = useState(bookData);
	const [search, setSearch] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [fetchError, setFetchError] = useState('');
	const liked = sourceBooks.filter(isBookFavorite);

	useEffect(() => {
		let isActive = true;

		const loadBooks = async () => {
			setIsLoading(true);
			setFetchError('');

			try {
				const payload = await apiRequest('/api/books');
				const loadedBooks = getArrayPayload(payload);

				if (!isActive || !loadedBooks.length) return;

				setSourceBooks(loadedBooks);
				setBooks(loadedBooks);
			} catch (error) {
				if (isActive) setFetchError(error.message);
			} finally {
				if (isActive) setIsLoading(false);
			}
		}

		loadBooks();

		return () => {
			isActive = false;
		};
	}, []);

	const searchHandler = () => {
		const normalizedSearch = search.trim();

		if (normalizedSearch) {
			const newBooks = sourceBooks.filter(book =>
				String(book.title || '').toLowerCase().includes(normalizedSearch.toLowerCase()));
			setBooks(newBooks);
		} else {
			setBooks(sourceBooks)
		}
	}

	return (
		<>
			<SearchBox search={search} setSearch={setSearch} searchHandler={searchHandler} />
			{isLoading && <p className={styles.status}>Syncing the latest shelf...</p>}
			{fetchError && <p className={`${styles.status} ${styles.error}`}>Server is unavailable, showing the local shelf.</p>}
			<div className={styles.container}>
				<div className={styles.cards}>
					{books.map(book => (
						<BookCard
							key={book.id}
							data={book}
							isLiked={isBookFavorite(book)}
							handleLikedList={onToggleFavorite}
							onOpenBook={onOpenBook}
						/>
					))}
				</div>
				{!!liked.length &&
					<div className={styles.favorite}>
						<h4>Favorite &hearts;</h4>
						{liked.map(book => <SideCard key={book.id} data={book} />)}
					</div>}
			</div>
		</>
	)
}

export default Book
