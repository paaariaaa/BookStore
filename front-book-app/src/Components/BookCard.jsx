import { AiFillHeart } from "react-icons/ai";

import { resolveMediaUrl } from '../services/api';
import styles from './BooksCard.module.css';

function BookCard({ data, isLiked, handleLikedList, onOpenBook }) {

	const { title, author, image, language, pages } = data;
	const coverImage = resolveMediaUrl(image);

	const likeHandler = (event) => {
		event.stopPropagation();
		handleLikedList?.(data, isLiked);
	}

	const keyDownHandler = (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onOpenBook?.(data);
		}
	}

	return (
		<div
			className={styles.card}
			onClick={() => onOpenBook?.(data)}
			onKeyDown={keyDownHandler}
			role="button"
			tabIndex={0}
			aria-label={`View details for ${title}`}
		>
			{coverImage ? <img src={coverImage} alt={title} /> : <div className={styles.coverFallback}>{title}</div>}
			<div className={styles.info}>
				<h3>{title}</h3>
				<h3>{author}</h3>
				<div>
					<span>{language}</span>
					<span>{pages}</span>
				</div>
			</div>
			<button type="button" onClick={likeHandler} aria-label={isLiked ? `Remove ${title} from favorites` : `Add ${title} to favorites`}>
				<AiFillHeart color={isLiked ? "red" : "#e0e0e0"} fontSize="1.8rem" />
			</button>
		</div>
	)
}

export default BookCard
