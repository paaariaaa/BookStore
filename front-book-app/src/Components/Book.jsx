import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { apiRequest, getArrayPayload, getStoredAuthToken } from '../services/api';
import BookCard from './BookCard';
import styles from './Books.module.css';
import SearchBox from './SearchBox';
import SideCard from './SideCard';

const getFavoriteStatus = (book) => book.isFavorite ?? book.is_favorite;

function Book({ getCartQuantity, isBookFavorite = getFavoriteStatus, onAddToCart, onChangeCartQuantity, onOpenBook, onToggleFavorite }) {
	const [sourceBooks, setSourceBooks] = useState([]);
	const [books, setBooks] = useState([]);
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
				const [payload, favoritesPayload] = await Promise.all([
					apiRequest('/api/books/'),
					getStoredAuthToken()
						? apiRequest('/api/books/favorites/').catch(() => [])
						: Promise.resolve([]),
				]);
				const loadedBooks = getArrayPayload(payload);
				const favoriteIds = new Set(
					getArrayPayload(favoritesPayload).map((book) => String(book.id))
				);
				const normalizedBooks = loadedBooks.map((book) => ({
					...book,
					is_favorite: favoriteIds.has(String(book.id)) || Boolean(book.is_favorite),
				}));

				if (!isActive) return;

				setSourceBooks(normalizedBooks);
				setBooks(normalizedBooks);
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
			{fetchError && <p className={`${styles.status} ${styles.error}`}>Could not reach the bookstore server. Please try again.</p>}
			<div className={styles.container}>
				<div className={styles.cards}>
					{!isLoading && !fetchError && !books.length && <p className={styles.status}>No books have been added yet.</p>}
					{books.map(book => (
						<BookCard
							key={book.id}
							data={book}
							isLiked={isBookFavorite(book)}
							cartQuantity={getCartQuantity(book.id)}
							handleLikedList={onToggleFavorite}
							onAddToCart={onAddToCart}
							onChangeCartQuantity={onChangeCartQuantity}
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

Book.propTypes = {
	getCartQuantity: PropTypes.func.isRequired,
	isBookFavorite: PropTypes.func,
	onAddToCart: PropTypes.func.isRequired,
	onChangeCartQuantity: PropTypes.func.isRequired,
	onOpenBook: PropTypes.func.isRequired,
	onToggleFavorite: PropTypes.func.isRequired,
};

export default Book
