import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
	IoAddOutline,
	IoBagHandleOutline,
	IoBookOutline,
	IoCardOutline,
	IoCheckmarkCircleOutline,
	IoCloseOutline,
	IoCopyOutline,
	IoReceiptOutline,
	IoRefreshOutline,
	IoRemoveOutline,
	IoShieldCheckmarkOutline,
	IoSparklesOutline,
	IoSyncOutline,
	IoTrashOutline,
	IoWarningOutline,
} from 'react-icons/io5';

import { formatToman, resolveMediaUrl } from '../services/api';
import styles from './CartDrawer.module.css';

const formatOrderDate = (date) => {
	if (!date) return 'Just now';

	const parsedDate = new Date(date);
	if (Number.isNaN(parsedDate.getTime())) return 'Just now';

	return new Intl.DateTimeFormat('en', {
		day: '2-digit',
		hour: '2-digit',
		hour12: false,
		minute: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(parsedDate);
};

const getPaymentLabel = (checkoutPhase) => {
	if (checkoutPhase === 'reviewing') return 'Checking latest basket…';
	if (checkoutPhase === 'processing') return 'Securing your order…';
	if (checkoutPhase === 'retry') return 'Retry this payment safely';
	if (checkoutPhase === 'failed') return 'Try a new payment';
	if (checkoutPhase === 'adjust') return 'Review basket and try again';

	return 'Complete mock purchase';
};

function OrderReceipt({ onContinue, order }) {
	const [isCopied, setIsCopied] = useState(false);
	const items = Array.isArray(order.items) ? order.items : [];
	const totalItems = items.reduce((total, item) => total + Number(item.quantity || 0), 0);

	useEffect(() => {
		if (!isCopied) return undefined;

		const timeoutId = window.setTimeout(() => setIsCopied(false), 2200);
		return () => window.clearTimeout(timeoutId);
	}, [isCopied]);

	const copyReference = async () => {
		if (!order.reference || !navigator.clipboard) return;

		try {
			await navigator.clipboard.writeText(order.reference);
			setIsCopied(true);
		} catch {
			setIsCopied(false);
		}
	};

	return (
		<div className={styles.receipt}>
			<section className={styles.receiptHero}>
				<div className={styles.receiptSparkles} aria-hidden="true"><i /><i /><i /><i /></div>
				<span className={styles.successSeal}><IoCheckmarkCircleOutline /></span>
				<small>PAYMENT COMPLETE</small>
				<h3>Your books are officially yours.</h3>
				<p>The shelf is being prepared. Keep this reference for your records.</p>
			</section>

			<section className={styles.referenceCard}>
				<div><IoReceiptOutline /><span><small>ORDER REFERENCE</small><strong>{order.reference}</strong></span></div>
				<button type="button" onClick={copyReference} disabled={!navigator.clipboard} aria-label="Copy order reference">
					{isCopied ? <IoCheckmarkCircleOutline /> : <IoCopyOutline />}
					{isCopied ? 'Copied' : 'Copy'}
				</button>
			</section>

			<section className={styles.receiptItems} aria-label="Purchased books">
				<header><span>ORDER SUMMARY</span><small>{totalItems} book{totalItems === 1 ? '' : 's'}</small></header>
				{items.map((item, index) => (
					<article key={`${item.book}-${index}`}>
						<span className={styles.receiptBook}><IoBookOutline /><b>{index + 1}</b></span>
						<div><strong>{item.title}</strong><small>{item.quantity} × {formatToman(item.unit_price)}</small></div>
						<strong>{formatToman(item.line_total)}</strong>
					</article>
				))}
			</section>

			<section className={styles.receiptTotal}>
				<div><span>Paid at</span><strong>{formatOrderDate(order.paid_at || order.created_at)}</strong></div>
				<div><span>Total paid</span><strong>{formatToman(order.total_amount)}</strong></div>
			</section>

			<div className={styles.receiptAssurance}><IoShieldCheckmarkOutline /><span><strong>Order secured</strong>Your basket and stock were updated together by the server.</span></div>
			<button className={styles.continueButton} type="button" onClick={onContinue}><IoSparklesOutline /> Continue exploring</button>
		</div>
	);
}

OrderReceipt.propTypes = {
	onContinue: PropTypes.func.isRequired,
	order: PropTypes.shape({
		created_at: PropTypes.string,
		items: PropTypes.arrayOf(PropTypes.shape({
			book: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
			line_total: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
			quantity: PropTypes.number,
			title: PropTypes.string,
			unit_price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		})),
		paid_at: PropTypes.string,
		reference: PropTypes.string,
		total_amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	}).isRequired,
};

function CartDrawer({
	cart,
	checkoutPhase,
	error,
	isOpen,
	isPaying,
	onChangeQuantity,
	onCheckout,
	onClear,
	onClose,
	onDismissOrder,
	onOpenBook,
	onRemove,
	order,
	subtotal,
}) {
	const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
	const hasReceipt = order?.status === 'paid';
	const hasFailedPayment = order?.status === 'failed';
	const paymentLabel = getPaymentLabel(checkoutPhase);
	const cartIsLocked = isPaying || checkoutPhase === 'retry';

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
			<button className={styles.backdrop} type="button" onClick={onClose} tabIndex={isOpen ? 0 : -1} aria-label="Close shopping cart" />
			<aside className={styles.drawer} role="dialog" aria-modal="true" aria-busy={isPaying} aria-label={hasReceipt ? 'Order receipt' : 'Shopping cart'}>
				<header className={styles.header}>
					<div className={`${styles.headingIcon} ${hasReceipt ? styles.receiptHeadingIcon : ''}`}>
						{hasReceipt ? <IoReceiptOutline /> : <IoBagHandleOutline />}
						{!hasReceipt && <span>{totalItems}</span>}
					</div>
					<div>
						<small>{hasReceipt ? 'ORDER CONFIRMED' : 'YOUR SELECTION'}</small>
						<h2>{hasReceipt ? 'Purchase receipt' : 'Reading cart'}</h2>
					</div>
					<button className={styles.close} type="button" onClick={onClose} aria-label="Close shopping cart"><IoCloseOutline /></button>
				</header>

				{hasReceipt ? (
					<OrderReceipt order={order} onContinue={onDismissOrder} />
				) : cart.length ? (
					<>
						<div className={styles.items}>
							{error && (
								<div className={`${styles.errorMessage} ${checkoutPhase === 'retry' ? styles.retryMessage : ''}`} role="alert">
									<IoWarningOutline />
									<span><strong>{checkoutPhase === 'retry' ? 'Payment result needs confirmation' : checkoutPhase === 'adjust' ? 'Basket needs attention' : 'Something needs attention'}</strong>{error}</span>
								</div>
							)}
							{hasFailedPayment && (
								<div className={styles.failedMessage} role="status">
									<IoCardOutline />
									<span><strong>Payment was not completed</strong>No books were charged and your basket is unchanged.</span>
									<small>Ref {order.reference}</small>
								</div>
							)}

							{cart.map((item) => {
								const cover = resolveMediaUrl(item.image);

								return (
									<article className={styles.item} key={item.id}>
										<button className={styles.cover} type="button" onClick={() => { onOpenBook(item); onClose(); }} disabled={isPaying}>
											{cover ? <img src={cover} alt={item.title} /> : <IoBookOutline />}
										</button>
										<div className={styles.itemInfo}>
											<strong>{item.title}</strong>
											<span>{item.author || 'Unknown author'}</span>
											<div className={styles.priceLine}><span>{formatToman(item.price)} each</span><strong>{formatToman(item.lineTotal ?? Number(item.price || 0) * item.quantity)}</strong></div>
											<div className={styles.quantity} aria-label={`Quantity for ${item.title}`}>
												<button type="button" onClick={() => onChangeQuantity(item.id, -1)} aria-label={`Decrease ${item.title}`} disabled={cartIsLocked}><IoRemoveOutline /></button>
												<b>{item.quantity}</b>
												<button type="button" onClick={() => onChangeQuantity(item.id, 1)} aria-label={`Increase ${item.title}`} disabled={cartIsLocked}><IoAddOutline /></button>
											</div>
										</div>
										<button className={styles.remove} type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`} disabled={cartIsLocked}><IoTrashOutline /></button>
									</article>
								);
							})}
						</div>

						<footer className={styles.summary}>
							<div><span>Selected editions</span><strong>{cart.length}</strong></div>
							<div><span>Total books</span><strong>{totalItems}</strong></div>
							<div className={styles.subtotalRow}><span>Current subtotal</span><strong>{formatToman(subtotal)}</strong></div>
							<button className={styles.payButton} type="button" onClick={onCheckout} disabled={isPaying}>
								{isPaying ? <IoSyncOutline className={styles.spinIcon} /> : checkoutPhase === 'retry' || checkoutPhase === 'failed' ? <IoRefreshOutline /> : <IoCardOutline />}
								{paymentLabel}
							</button>
							<button className={styles.clearButton} type="button" onClick={onClear} disabled={cartIsLocked}>Clear basket</button>
							<p className={checkoutPhase === 'retry' ? styles.checkoutLockNote : ''}><IoShieldCheckmarkOutline /> {checkoutPhase === 'retry' ? 'Basket changes are paused until this payment attempt is confirmed.' : 'Price and stock are verified by the server before the mock payment.'}</p>
						</footer>
					</>
				) : (
					<div className={styles.empty}>
						{error && <div className={styles.emptyError} role="alert"><IoWarningOutline /> {error}</div>}
						<div className={styles.emptyIllustration}><IoBookOutline /><IoAddOutline /></div>
						<h3>Your cart is waiting for a story</h3>
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
		lineTotal: PropTypes.string,
		price: PropTypes.string,
		quantity: PropTypes.number.isRequired,
		title: PropTypes.string.isRequired,
	})).isRequired,
	checkoutPhase: PropTypes.oneOf(['idle', 'reviewing', 'processing', 'retry', 'failed', 'adjust', 'paid']).isRequired,
	error: PropTypes.string.isRequired,
	isOpen: PropTypes.bool.isRequired,
	isPaying: PropTypes.bool.isRequired,
	onChangeQuantity: PropTypes.func.isRequired,
	onCheckout: PropTypes.func.isRequired,
	onClear: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
	onDismissOrder: PropTypes.func.isRequired,
	onOpenBook: PropTypes.func.isRequired,
	onRemove: PropTypes.func.isRequired,
	order: PropTypes.shape({
		created_at: PropTypes.string,
		items: PropTypes.array,
		paid_at: PropTypes.string,
		reference: PropTypes.string,
		status: PropTypes.oneOf(['paid', 'failed']),
		total_amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	}),
	subtotal: PropTypes.string.isRequired,
};

export default CartDrawer;
