import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
	IoChatbubbleEllipsesOutline,
	IoCheckmarkCircleOutline,
	IoCloseOutline,
	IoCreateOutline,
	IoLogInOutline,
	IoRefreshOutline,
	IoSendOutline,
	IoShieldCheckmarkOutline,
	IoSparklesOutline,
	IoStar,
	IoStarOutline,
	IoTrashOutline,
	IoWarningOutline,
} from 'react-icons/io5';

import { apiRequest, getArrayPayload, getSinglePayload } from '../services/api';
import styles from './BookReviews.module.css';

const STAR_VALUES = [1, 2, 3, 4, 5];
const RATING_LABELS = ['Choose a rating', 'Not for me', 'It was okay', 'Worth reading', 'A great read', 'Exceptional'];

const getReviewsUrl = (bookId) => `/api/books/${bookId}/reviews/`;
const getReviewUrl = (bookId, reviewId) => `${getReviewsUrl(bookId)}${reviewId}/`;

const getErrorMessage = (error, fallback) => {
	if (error?.status === 403) return 'دسترسی ندارید';

	return error?.message || fallback;
};

const formatReviewDate = (date) => {
	if (!date) return 'Recently';

	const parsedDate = new Date(date);
	if (Number.isNaN(parsedDate.getTime())) return 'Recently';

	return new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(parsedDate);
};

const wasReviewEdited = (review) => {
	const createdAt = new Date(review.created_at).getTime();
	const updatedAt = new Date(review.updated_at).getTime();

	return Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 1000;
};

const getInitials = (name = '') => name
	.split(/[\s._-]+/)
	.filter(Boolean)
	.slice(0, 2)
	.map((part) => part[0])
	.join('')
	.toUpperCase() || 'R';

const getAvatarHue = (name = '') => Array.from(name).reduce(
	(total, character) => (total + character.charCodeAt(0) * 17) % 360,
	28,
);

function DisplayStars({ value, label }) {
	const safeValue = Math.min(5, Math.max(0, Number(value) || 0));

	return (
		<div className={styles.displayStars} aria-label={label || `${safeValue.toFixed(1)} out of 5 stars`}>
			{STAR_VALUES.map((star) => {
				const fill = Math.min(100, Math.max(0, (safeValue - star + 1) * 100));

				return (
					<span className={styles.displayStar} key={star} aria-hidden="true">
						<IoStarOutline />
						<i style={{ width: `${fill}%` }}><IoStar /></i>
					</span>
				);
			})}
		</div>
	);
}

DisplayStars.propTypes = {
	label: PropTypes.string,
	value: PropTypes.number.isRequired,
};

function RatingPicker({ disabled, onChange, value }) {
	const [previewValue, setPreviewValue] = useState(0);
	const visibleValue = previewValue || value;

	return (
		<div className={styles.ratingPicker}>
			<div
				className={styles.interactiveStars}
				role="radiogroup"
				aria-label="Your rating"
				onMouseLeave={() => setPreviewValue(0)}
			>
				{STAR_VALUES.map((star) => {
					const Icon = star <= visibleValue ? IoStar : IoStarOutline;

					return (
						<button
							key={star}
							type="button"
							role="radio"
							className={styles.starButton}
							onClick={() => onChange(star)}
							onFocus={() => setPreviewValue(star)}
							onBlur={() => setPreviewValue(0)}
							onMouseEnter={() => setPreviewValue(star)}
							aria-checked={star === value}
							aria-label={`${star} star${star === 1 ? '' : 's'}: ${RATING_LABELS[star]}`}
							disabled={disabled}
						>
							<Icon aria-hidden="true" />
						</button>
					);
				})}
			</div>
			<span>{RATING_LABELS[visibleValue]}</span>
		</div>
	);
}

RatingPicker.propTypes = {
	disabled: PropTypes.bool.isRequired,
	onChange: PropTypes.func.isRequired,
	value: PropTypes.number.isRequired,
};

function BookReviews({ bookId, bookTitle, currentUser, onLoginClick }) {
	const [reviews, setReviews] = useState([]);
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState('');
	const [editingReviewId, setEditingReviewId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [formError, setFormError] = useState('');
	const [notice, setNotice] = useState('');
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState('');
	const composerRef = useRef(null);
	const requestIdRef = useRef(0);

	const ownReview = useMemo(
		() => reviews.find((review) => review.is_owner) || null,
		[reviews],
	);
	const orderedReviews = useMemo(() => [...reviews].sort((first, second) => (
		Number(Boolean(second.is_owner)) - Number(Boolean(first.is_owner))
	)), [reviews]);
	const averageRating = useMemo(() => reviews.length
		? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
		: 0, [reviews]);
	const ratingDistribution = useMemo(() => STAR_VALUES.slice().reverse().map((star) => ({
		star,
		count: reviews.filter((review) => Number(review.rating) === star).length,
		percentage: reviews.length
			? (reviews.filter((review) => Number(review.rating) === star).length / reviews.length) * 100
			: 0,
	})), [reviews]);
	const isEditing = editingReviewId !== null;
	const showComposer = Boolean(currentUser) && !isLoading && !loadError && (!ownReview || isEditing);
	const canSubmit = rating >= 1 && rating <= 5 && Boolean(comment.trim()) && !isSaving;

	const resetComposer = useCallback(() => {
		setEditingReviewId(null);
		setRating(0);
		setComment('');
		setFormError('');
	}, []);

	const loadReviews = useCallback(async () => {
		const activeRequestId = requestIdRef.current + 1;
		requestIdRef.current = activeRequestId;
		setIsLoading(true);
		setLoadError('');

		try {
			const payload = await apiRequest(getReviewsUrl(bookId));
			if (requestIdRef.current === activeRequestId) setReviews(getArrayPayload(payload));
		} catch (error) {
			if (requestIdRef.current === activeRequestId) {
				setLoadError(getErrorMessage(error, 'Reviews could not be loaded.'));
			}
		} finally {
			if (requestIdRef.current === activeRequestId) setIsLoading(false);
		}
	}, [bookId]);

	useEffect(() => {
		setReviews([]);
		setNotice('');
		resetComposer();
		loadReviews();

		return () => {
			requestIdRef.current += 1;
		};
	}, [loadReviews, resetComposer]);

	useEffect(() => {
		if (!notice) return undefined;

		const timeoutId = window.setTimeout(() => setNotice(''), 4200);
		return () => window.clearTimeout(timeoutId);
	}, [notice]);

	useEffect(() => {
		if (!deleteTarget) return undefined;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const closeOnEscape = (event) => {
			if (event.key === 'Escape' && !isDeleting) setDeleteTarget(null);
		};

		window.addEventListener('keydown', closeOnEscape);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', closeOnEscape);
		};
	}, [deleteTarget, isDeleting]);

	const submitReview = async (event) => {
		event.preventDefault();
		const trimmedComment = comment.trim();

		if (rating < 1 || rating > 5) {
			setFormError('Choose a rating from 1 to 5 stars.');
			return;
		}

		if (!trimmedComment) {
			setFormError('Write a comment before submitting.');
			return;
		}

		setIsSaving(true);
		setFormError('');
		setNotice('');

		try {
			const payload = await apiRequest(
				isEditing ? getReviewUrl(bookId, editingReviewId) : getReviewsUrl(bookId),
				{
					body: { comment: trimmedComment, rating },
					method: isEditing ? 'PATCH' : 'POST',
				},
			);
			const savedReview = getSinglePayload(payload);

			if (savedReview?.id) {
				setReviews((currentReviews) => isEditing
					? currentReviews.map((review) => String(review.id) === String(savedReview.id) ? savedReview : review)
					: [savedReview, ...currentReviews]);
			} else {
				await loadReviews();
			}

			setNotice(isEditing ? 'Your review was updated.' : 'Your review is now on the community shelf.');
			resetComposer();
		} catch (error) {
			setFormError(getErrorMessage(error, 'Your review could not be saved.'));
		} finally {
			setIsSaving(false);
		}
	};

	const editReview = (review) => {
		setEditingReviewId(review.id);
		setRating(Number(review.rating));
		setComment(review.comment || '');
		setFormError('');
		setNotice('');
		window.requestAnimationFrame(() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
	};

	const openDeleteDialog = (review) => {
		setDeleteTarget(review);
		setDeleteError('');
	};

	const deleteReview = async () => {
		if (!deleteTarget?.id) return;

		setIsDeleting(true);
		setDeleteError('');
		setNotice('');

		try {
			await apiRequest(getReviewUrl(bookId, deleteTarget.id), { method: 'DELETE' });
			setReviews((currentReviews) => currentReviews.filter((review) => String(review.id) !== String(deleteTarget.id)));
			if (String(editingReviewId) === String(deleteTarget.id)) resetComposer();
			setNotice(deleteTarget.is_owner ? 'Your review was removed.' : 'The review was removed from the community shelf.');
			setDeleteTarget(null);
		} catch (error) {
			setDeleteError(getErrorMessage(error, 'The review could not be deleted.'));
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<section className={styles.section} aria-labelledby="reviews-heading">
			<header className={styles.header}>
				<div className={styles.headingCopy}>
					<span className={styles.kicker}><IoSparklesOutline /> COMMUNITY SHELF</span>
					<h3 id="reviews-heading">What readers are saying</h3>
					<p>Thoughtful notes from people who opened this story.</p>
				</div>

				<div className={styles.ratingOverview} aria-label="Review summary">
					<div className={styles.averageScore}>
						<strong>{reviews.length ? averageRating.toFixed(1) : '—'}</strong>
						<div>
							<DisplayStars value={averageRating} />
							<span>{reviews.length} reader review{reviews.length === 1 ? '' : 's'}</span>
						</div>
					</div>
					<div className={styles.distribution}>
						{ratingDistribution.map(({ star, count, percentage }) => (
							<div key={star}>
								<span>{star}<IoStar /></span>
								<i><b style={{ width: `${percentage}%` }} /></i>
								<small>{count}</small>
							</div>
						))}
					</div>
				</div>
			</header>

			{notice && (
				<div className={styles.notice} role="status">
					<IoCheckmarkCircleOutline />
					<span>{notice}</span>
					<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><IoCloseOutline /></button>
				</div>
			)}

			{isLoading ? (
				<div className={styles.loadingState} aria-label="Loading reviews">
					<div className={styles.loadingBook}><i /><i /><span /></div>
					<p>Opening the readers’ notes…</p>
					<div className={styles.skeletons}><i /><i /></div>
				</div>
			) : loadError ? (
				<div className={styles.loadError} role="alert">
					<IoWarningOutline />
					<div><strong>Reader notes are unavailable.</strong><span>{loadError}</span></div>
					<button type="button" onClick={loadReviews}><IoRefreshOutline /> Try again</button>
				</div>
			) : (
				<>
					{currentUser?.is_staff === true && (
						<div className={styles.moderationNote}>
							<IoShieldCheckmarkOutline />
							<span><strong>Staff moderation is active.</strong> Delete controls are shown only where the API grants access.</span>
						</div>
					)}

					{currentUser ? (
						ownReview && !isEditing ? (
							<div className={styles.ownReviewPrompt}>
								<span className={styles.ownReviewIcon}><IoCheckmarkCircleOutline /></span>
								<div>
									<strong>Your note is on this shelf</strong>
									<p>You can refine your words or rating whenever you like.</p>
								</div>
								<button type="button" onClick={() => editReview(ownReview)}><IoCreateOutline /> Edit my review</button>
							</div>
						) : showComposer ? (
							<form className={styles.form} onSubmit={submitReview} ref={composerRef}>
								<div className={styles.formHeader}>
									<div className={styles.identity}>
										<span className={styles.avatar} style={{ '--avatar-hue': getAvatarHue(currentUser.username) }}>{getInitials(currentUser.displayName || currentUser.username)}</span>
										<div>
											<strong>{isEditing ? 'Refine your review' : 'Leave a note for the next reader'}</strong>
											<span>Writing as {currentUser.displayName || currentUser.username}</span>
										</div>
									</div>
									<RatingPicker value={rating} onChange={(value) => { setRating(value); setFormError(''); }} disabled={isSaving} />
								</div>

								<label className={styles.commentField}>
									<span>Your review</span>
									<textarea
										value={comment}
										onChange={(event) => { setComment(event.target.value); setFormError(''); }}
										maxLength={2000}
										placeholder={`What should other readers know about ${bookTitle || 'this book'}?`}
										required
										disabled={isSaving}
									/>
									<small className={comment.length > 1800 ? styles.characterWarning : ''}>{comment.length}/2000</small>
								</label>

								{formError && <p className={styles.formError} role="alert"><IoWarningOutline /> {formError}</p>}
								<div className={styles.formActions}>
									<p>One review per reader · you can edit it later</p>
									<div>
										{isEditing && <button type="button" className={styles.secondaryButton} onClick={resetComposer} disabled={isSaving}>Cancel</button>}
										<button type="submit" className={styles.submitButton} disabled={!canSubmit}>
											{isSaving ? <span className={styles.buttonSpinner} /> : <IoSendOutline />}
											{isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Publish review'}
										</button>
									</div>
								</div>
							</form>
						) : null
					) : (
						<div className={styles.loginPrompt}>
							<span className={styles.loginIllustration}><IoChatbubbleEllipsesOutline /><IoStar /></span>
							<div>
								<strong>Read freely. Join in when you’re ready.</strong>
								<p>Sign in to leave one rating and review for this book.</p>
							</div>
							<button type="button" onClick={onLoginClick}><IoLogInOutline /> Sign in to review</button>
						</div>
					)}

					<div className={styles.listHeading}>
						<div><span>READER NOTES</span><strong>{reviews.length ? `${reviews.length} published` : 'The shelf is quiet'}</strong></div>
						{reviews.length > 0 && <small>Newest reflections first</small>}
					</div>

					<div className={styles.list}>
						{orderedReviews.length ? orderedReviews.map((review, index) => {
							const wasEdited = wasReviewEdited(review);
							const reviewDate = review.updated_at || review.created_at;

							return (
								<article
									key={review.id}
									className={`${styles.reviewCard} ${review.is_owner ? styles.ownReview : ''} ${String(editingReviewId) === String(review.id) ? styles.editingReview : ''}`}
									style={{ '--review-delay': `${Math.min(index, 7) * 55}ms` }}
								>
									<div className={styles.reviewTopline}>
										<div className={styles.identity}>
											<span className={styles.avatar} style={{ '--avatar-hue': getAvatarHue(review.username) }}>{getInitials(review.username)}</span>
											<div>
												<strong>{review.username || 'Reader'} {review.is_owner && <em>You</em>}</strong>
												<time dateTime={reviewDate}>{wasEdited ? 'Edited ' : ''}{formatReviewDate(reviewDate)}</time>
											</div>
										</div>
										<div className={styles.cardRating}><DisplayStars value={Number(review.rating)} /><strong>{review.rating}.0</strong></div>
									</div>
									<p>{review.comment}</p>
									{(review.can_edit || review.can_delete) && (
										<div className={styles.reviewActions}>
											{review.can_edit && <button type="button" onClick={() => editReview(review)} disabled={isSaving || isDeleting}><IoCreateOutline /> Edit</button>}
											{review.can_delete && <button className={styles.deleteButton} type="button" onClick={() => openDeleteDialog(review)} disabled={isSaving || isDeleting}><IoTrashOutline /> {review.is_owner ? 'Delete' : 'Remove'}</button>}
										</div>
									)}
								</article>
							);
						}) : (
							<div className={styles.empty}>
								<span><IoChatbubbleEllipsesOutline /><IoSparklesOutline /></span>
								<strong>No reader notes yet</strong>
								<p>Be the first person to leave a thoughtful mark on this page.</p>
							</div>
						)}
					</div>
				</>
			)}

			{deleteTarget && (
				<div className={styles.deleteBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isDeleting && setDeleteTarget(null)}>
					<div className={styles.deleteDialog} role="alertdialog" aria-modal="true" aria-labelledby="review-delete-title" aria-describedby="review-delete-description">
						<span className={styles.deleteIcon}><IoTrashOutline /></span>
						<small>{deleteTarget.is_owner ? 'YOUR REVIEW' : 'STAFF MODERATION'}</small>
						<h4 id="review-delete-title">Remove this reader note?</h4>
						<p id="review-delete-description">{deleteTarget.is_owner
							? 'Your rating and words will leave this shelf permanently.'
							: `The review by ${deleteTarget.username || 'this reader'} will be permanently removed.`}</p>
						{deleteError && <p className={styles.deleteError} role="alert">{deleteError}</p>}
						<div>
							<button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} autoFocus>Keep review</button>
							<button type="button" onClick={deleteReview} disabled={isDeleting}>{isDeleting ? 'Removing…' : 'Remove permanently'}</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

BookReviews.propTypes = {
	bookId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
	bookTitle: PropTypes.string,
	currentUser: PropTypes.shape({
		displayName: PropTypes.string,
		is_staff: PropTypes.bool,
		username: PropTypes.string,
	}),
	onLoginClick: PropTypes.func.isRequired,
};

export default BookReviews;
