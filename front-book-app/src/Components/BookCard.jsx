import { AiFillHeart } from "react-icons/ai";
import { IoAddOutline, IoBagAddOutline, IoRemoveOutline } from 'react-icons/io5';
import PropTypes from 'prop-types';

import { resolveMediaUrl } from '../services/api';
import styles from './BooksCard.module.css';

function BookCard({ cartQuantity, data, isLiked, handleLikedList, onAddToCart, onChangeCartQuantity, onOpenBook }) {

	const { title, author, image, language, pages } = data;
	const coverImage = resolveMediaUrl(image);

	const likeHandler = (event) => {
		event.stopPropagation();
		handleLikedList?.(data, isLiked);
	}

	const cartHandler = (event) => {
		event.stopPropagation();
		onAddToCart(data);
	}

	const quantityHandler = (event, amount) => {
		event.stopPropagation();
		onChangeCartQuantity(data.id, amount);
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
			<div className={styles.actions}>
				<button className={styles.favoriteButton} type="button" onClick={likeHandler} aria-label={isLiked ? `Remove ${title} from favorites` : `Add ${title} to favorites`}>
					<AiFillHeart color={isLiked ? "#f25f5c" : "#9b9b9b"} fontSize="1.35rem" />
				</button>
				{cartQuantity ? (
					<div className={styles.quantity} aria-label={`Quantity for ${title}`}>
						<button type="button" onClick={(event) => quantityHandler(event, -1)} aria-label={`Decrease ${title}`}><IoRemoveOutline /></button>
						<b>{cartQuantity}</b>
						<button type="button" onClick={(event) => quantityHandler(event, 1)} aria-label={`Increase ${title}`}><IoAddOutline /></button>
					</div>
				) : (
					<button className={styles.addButton} type="button" onClick={cartHandler}><IoBagAddOutline /><span>Add</span></button>
				)}
			</div>
		</div>
	)
}

BookCard.propTypes = {
	cartQuantity: PropTypes.number.isRequired,
	data: PropTypes.shape({
		id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
		author: PropTypes.string,
		image: PropTypes.string,
		language: PropTypes.string,
		pages: PropTypes.number,
		title: PropTypes.string.isRequired,
	}).isRequired,
	handleLikedList: PropTypes.func.isRequired,
	isLiked: PropTypes.bool.isRequired,
	onAddToCart: PropTypes.func.isRequired,
	onChangeCartQuantity: PropTypes.func.isRequired,
	onOpenBook: PropTypes.func.isRequired,
};

export default BookCard
