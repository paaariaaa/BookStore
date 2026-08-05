import { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
	IoAddOutline,
	IoBagHandleOutline,
	IoBookOutline,
	IoCloseOutline,
	IoRemoveOutline,
	IoTrashOutline,
} from 'react-icons/io5';

import { resolveMediaUrl } from '../services/api';
import styles from './CartDrawer.module.css';

function CartDrawer({ cart, isOpen, onChangeQuantity, onClose, onOpenBook, onRemove }) {
	const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

	useEffect(() => {
		if (!isOpen) return undefined;

		const closeOnEscape = (event) => {
			if (event.key === 'Escape') onClose();
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', closeOnEscape);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', closeOnEscape);
		};
	}, [isOpen, onClose]);

	return (
		<div className={`${styles.layer} ${isOpen ? styles.open : ''}`} aria-hidden={!isOpen}>
			<button className={styles.backdrop} type="button" onClick={onClose} tabIndex={isOpen ? 0 : -1} aria-label="Close shopping bag" />
			<aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Shopping bag">
				<header className={styles.header}>
					<div className={styles.headingIcon}><IoBagHandleOutline /><span>{totalItems}</span></div>
					<div><small>YOUR SELECTION</small><h2>Reading bag</h2></div>
					<button className={styles.close} type="button" onClick={onClose} aria-label="Close shopping bag"><IoCloseOutline /></button>
				</header>

				{cart.length ? (
					<>
						<div className={styles.items}>
							{cart.map((item) => {
								const cover = resolveMediaUrl(item.image);
								return (
									<article className={styles.item} key={item.id}>
										<button className={styles.cover} type="button" onClick={() => { onOpenBook(item); onClose(); }}>
											{cover ? <img src={cover} alt={item.title} /> : <IoBookOutline />}
										</button>
										<div className={styles.itemInfo}>
											<strong>{item.title}</strong>
											<span>{item.author || 'Unknown author'}</span>
											<div className={styles.quantity} aria-label={`Quantity for ${item.title}`}>
												<button type="button" onClick={() => onChangeQuantity(item.id, -1)} aria-label={`Decrease ${item.title}`}><IoRemoveOutline /></button>
												<b>{item.quantity}</b>
												<button type="button" onClick={() => onChangeQuantity(item.id, 1)} aria-label={`Increase ${item.title}`}><IoAddOutline /></button>
											</div>
										</div>
										<button className={styles.remove} type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}><IoTrashOutline /></button>
									</article>
								);
							})}
						</div>
						<footer className={styles.summary}>
							<div><span>Selected editions</span><strong>{cart.length}</strong></div>
							<div><span>Total books</span><strong>{totalItems}</strong></div>
							<p>Prices and checkout will appear when pricing is available from the bookstore.</p>
						</footer>
					</>
				) : (
					<div className={styles.empty}>
						<div><IoBookOutline /><IoAddOutline /></div>
						<h3>Your bag is waiting for a story</h3>
						<p>Add a book from the shelf and it will stay here for your next visit.</p>
						<button type="button" onClick={onClose}>Explore the shelf</button>
					</div>
				)}
			</aside>
		</div>
	);
}

CartDrawer.propTypes = {
	cart: PropTypes.arrayOf(PropTypes.shape({
		author: PropTypes.string,
		id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
		image: PropTypes.string,
		quantity: PropTypes.number.isRequired,
		title: PropTypes.string.isRequired,
	})).isRequired,
	isOpen: PropTypes.bool.isRequired,
	onChangeQuantity: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
	onOpenBook: PropTypes.func.isRequired,
	onRemove: PropTypes.func.isRequired,
};

export default CartDrawer;
