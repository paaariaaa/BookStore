import { useEffect, useState } from 'react';
import {
	IoArrowBackOutline,
	IoBarcodeOutline,
	IoBookOutline,
	IoCalendarOutline,
	IoDocumentTextOutline,
	IoHeartOutline,
	IoHeartSharp,
	IoLanguageOutline,
	IoLayersOutline,
	IoTimeOutline,
} from 'react-icons/io5';

import { books as fallbackBooks } from '../constants/mockData';
import { apiRequest, getArrayPayload, getSinglePayload, resolveMediaUrl } from '../services/api';
import styles from './BookDetails.module.css';

const formatDate = (date) => {
	if (!date) return 'Not provided';
	const parsedDate = new Date(date);

	if (Number.isNaN(parsedDate.getTime())) return 'Not provided';

	return new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(parsedDate);
};

const formatYear = (year) => {
	if (year === undefined || year === null) return 'Not provided';

	return year < 0 ? `${Math.abs(year)} BCE` : year;
};

const parseDescription = (description = '') => {
	const lines = String(description)
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	return lines.reduce(
		(result, line) => {
			const bullet = line.replace(/^[•*-]\s*/, '').trim();

			const normalizedBullet = line.replace(/^(?:•|\*|-)\s*/, '').trim();
			const activeBullet = normalizedBullet !== line ? normalizedBullet : bullet;
			const unicodeBullet = line.charCodeAt(0) === 8226 ? line.slice(1).trim() : activeBullet;

			if (unicodeBullet !== line) {
				return {
					...result,
					bullets: [...result.bullets, unicodeBullet],
				};
			}

			return {
				...result,
				intro: [...result.intro, line],
			};
		},
		{ bullets: [], intro: [] }
	);
};

const getBookDetails = (book) => ({
	author: book.author,
	createdAt: book.createdAt ?? book.created_at,
	description: book.description,
	id: book.id,
	image: book.image,
	isFavorite: book.isFavorite ?? book.is_favorite,
	isbn: book.isbn,
	language: book.language,
	pages: book.pages,
	publishedYear: book.publishedYear ?? book.published_year ?? book.year,
	title: book.title,
	updatedAt: book.updatedAt ?? book.updated_at,
});

const getFavoriteStatus = (book = {}) => book.isFavorite ?? book.is_favorite;

function BookDetails({ book, bookId, isBookFavorite = getFavoriteStatus, onBack, onOpenBook, onToggleFavorite }) {
	const [serverBook, setServerBook] = useState(book);
	const [catalogBooks, setCatalogBooks] = useState([]);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [isLoading, setIsLoading] = useState(Boolean(bookId));

	useEffect(() => {
		let isActive = true;

		setServerBook(book);

		if (!bookId) {
			setIsLoading(false);
			return undefined;
		}

		const loadBookDetails = async () => {
			setIsLoading(true);

			try {
				const payload = await apiRequest(`/api/books/${bookId}`);
				const nextBook = getSinglePayload(payload);

				if (isActive && nextBook) setServerBook(nextBook);
			} catch {
				if (isActive && !book) setServerBook(null);
			} finally {
				if (isActive) setIsLoading(false);
			}
		}

		loadBookDetails();

		return () => {
			isActive = false;
		};
	}, [book, bookId]);

	useEffect(() => {
		let isActive = true;

		const loadCatalogBooks = async () => {
			setCatalogLoading(true);

			try {
				const payload = await apiRequest('/api/books');
				const nextBooks = getArrayPayload(payload);

				if (isActive) setCatalogBooks(nextBooks.length ? nextBooks : fallbackBooks);
			} catch {
				if (isActive) setCatalogBooks(fallbackBooks);
			} finally {
				if (isActive) setCatalogLoading(false);
			}
		}

		loadCatalogBooks();

		return () => {
			isActive = false;
		};
	}, []);

	if (!serverBook && isLoading) {
		return (
			<main className={styles.empty}>
				<IoBookOutline />
				<h2>Loading book</h2>
				<p>We are pulling the latest edition from the server.</p>
				<button type="button" onClick={onBack}>
					<IoArrowBackOutline />
					Back to books
				</button>
			</main>
		)
	}

	if (!serverBook) {
		return (
			<main className={styles.empty}>
				<IoBookOutline />
				<h2>Book not found</h2>
				<p>This shelf does not have the requested title yet.</p>
				<button type="button" onClick={onBack}>
					<IoArrowBackOutline />
					Back to books
				</button>
			</main>
		)
	}

	const details = getBookDetails(serverBook);
	const description = parseDescription(details.description);
	const coverImage = resolveMediaUrl(details.image);
	const isFavorite = isBookFavorite(serverBook);
	const catalog = catalogBooks.length ? catalogBooks : fallbackBooks;
	const relatedBooks = catalog
		.filter((item) => String(item.id) !== String(details.id))
		.slice(0, 6);
	const detailItems = [
		{
			icon: IoLanguageOutline,
			label: 'Language',
			value: details.language,
		},
		{
			icon: IoLayersOutline,
			label: 'Pages',
			value: details.pages,
		},
		{
			icon: IoCalendarOutline,
			label: 'Published year',
			value: formatYear(details.publishedYear),
		},
		{
			icon: IoBarcodeOutline,
			label: 'ISBN',
			value: details.isbn,
		},
	];

	return (
		<main className={styles.details}>
			<button className={styles.backButton} type="button" onClick={onBack}>
				<IoArrowBackOutline />
				Back to books
			</button>
			{isLoading && <span className={styles.syncBadge}>Updating from server</span>}

			<section className={styles.hero}>
				<div className={styles.coverWrap}>
					<div className={styles.bookCover}>
						<div className={styles.coverSpine} />
						{coverImage ? <img src={coverImage} alt={details.title} /> : <div className={styles.coverPlaceholder}>{details.title}</div>}
					</div>
					<div className={styles.coverShadow} />
				</div>

				<div className={styles.content}>
					<div className={styles.eyebrow}>
						<IoBookOutline />
						<span>Book details</span>
						{isFavorite && <strong>Favorite</strong>}
					</div>

					<div className={styles.titleRow}>
						<div>
							<h2>{details.title}</h2>
							<p className={styles.author}>by {details.author}</p>
						</div>

						<button
							className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
							type="button"
							onClick={() => onToggleFavorite?.(serverBook)}
							aria-pressed={isFavorite}
							aria-label={isFavorite ? `Remove ${details.title} from favorites` : `Add ${details.title} to favorites`}
						>
							{isFavorite ? <IoHeartSharp /> : <IoHeartOutline />}
							<span>{isFavorite ? 'Saved' : 'Favorite'}</span>
						</button>
					</div>
					<div className={styles.description}>
						{!!description.intro.length && <p>{description.intro.join(' ')}</p>}
						{!!description.bullets.length && (
							<ul>
								{description.bullets.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						)}
					</div>

					<div className={styles.metaGrid}>
						{detailItems.map(({ icon: Icon, label, value }) => (
							<div key={label} className={styles.metaCard}>
								<Icon />
								<span>{label}</span>
								<strong>{value || 'Not provided'}</strong>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className={styles.timeline}>
				<div className={styles.note}>
					<IoDocumentTextOutline />
					<div>
						<span>Shelf impression</span>
						<p>{details.title} is presented as a carefully selected title with a clear place in the store catalog.</p>
					</div>
				</div>

				<div className={styles.timeCard}>
					<IoTimeOutline />
					<span>Created at</span>
					<strong>{formatDate(details.createdAt)}</strong>
				</div>

				<div className={styles.timeCard}>
					<IoTimeOutline />
					<span>Updated at</span>
					<strong>{formatDate(details.updatedAt)}</strong>
				</div>
			</section>

			<section className={styles.relatedShelf}>
				<div className={styles.relatedHeader}>
					<div>
						<span>More from shelf</span>
						<h3>Keep browsing books</h3>
					</div>
					{catalogLoading && <small>Syncing...</small>}
				</div>

				<div className={styles.relatedList}>
					{relatedBooks.length ? relatedBooks.map((item) => {
						const itemImage = resolveMediaUrl(item.image);
						const itemFavorite = isBookFavorite(item);

						return (
							<article key={item.id} className={styles.relatedCard}>
								<button className={styles.relatedPick} type="button" onClick={() => onOpenBook?.(item)}>
									{itemImage ? <img src={itemImage} alt={item.title} /> : <strong>{item.title?.[0] || 'B'}</strong>}
									<span>
										<b>{item.title}</b>
										<small>{item.author}</small>
									</span>
								</button>

								<button
									className={`${styles.relatedHeart} ${itemFavorite ? styles.favoriteActive : ''}`}
									type="button"
									onClick={() => onToggleFavorite?.(item)}
									aria-pressed={itemFavorite}
									aria-label={itemFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
								>
									{itemFavorite ? <IoHeartSharp /> : <IoHeartOutline />}
								</button>
							</article>
						)
					}) : <p className={styles.relatedEmpty}>No other books are available on this shelf yet.</p>}
				</div>
			</section>
		</main>
	)
}

export default BookDetails;
