import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
	IoCreateOutline,
	IoSendOutline,
	IoStar,
	IoStarOutline,
	IoTrashOutline,
} from 'react-icons/io5';

import { apiRequest, getArrayPayload } from '../services/api';
import styles from './BookReviews.module.css';

const getReviewsUrl = (bookId) => `/api/books/${bookId}/reviews/`;

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

function RatingStars({ value, interactive = false, onChange }) {
	return (
		<div className={`${styles.stars} ${interactive ? styles.interactiveStars : ''}`}>
			{[1, 2, 3, 4, 5].map((star) => {
				const Icon = star <= value ? IoStar : IoStarOutline;

				if (!interactive) {
					return <Icon key={star} aria-hidden="true" />;
				}

				return (
					<button
						key={star}
						type="button"
						className={styles.starButton}
						onClick={() => onChange(star)}
						aria-label={`${star} star${star === 1 ? '' : 's'}`}
						aria-pressed={star === value}
					>
						<Icon aria-hidden="true" />
					</button>
				);
			})}
		</div>
	);
}

function BookReviews({ bookId, currentUser, onLoginClick }) {
	const [reviews, setReviews] = useState([]);
	const [rating, setRating] = useState(5);
	const [comment, setComment] = useState('');
	const [editingReviewId, setEditingReviewId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingReviewId, setDeletingReviewId] = useState(null);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	const ownReview = useMemo(
		() => reviews.find((review) => review.is_owner) || null,
		[reviews],
	);

	const loadReviews = useCallback(async () => {
		setIsLoading(true);
		setError('');

		try {
			const payload = await apiRequest(getReviewsUrl(bookId));
			const nextReviews = getArrayPayload(payload);
			const nextOwnReview = nextReviews.find((review) => review.is_owner);

			setReviews(nextReviews);
			if (nextOwnReview) {
				setEditingReviewId(nextOwnReview.id);
				setRating(nextOwnReview.rating);
				setComment(nextOwnReview.comment || '');
			} else {
				setEditingReviewId(null);
				setRating(5);
				setComment('');
			}
		} catch (loadError) {
			setError(loadError.message || 'Reviews could not be loaded.');
		} finally {
			setIsLoading(false);
		}
	}, [bookId]);

	useEffect(() => {
		loadReviews();
	}, [loadReviews]);

	const averageRating = reviews.length
		? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
		: 0;

	const submitReview = async (event) => {
		event.preventDefault();
		const trimmedComment = comment.trim();

		if (!trimmedComment) {
			setError('Write a comment before submitting.');
			return;
		}

		setIsSaving(true);
		setError('');
		setNotice('');

		try {
			await apiRequest(
				editingReviewId
					? `${getReviewsUrl(bookId)}${editingReviewId}/`
					: getReviewsUrl(bookId),
				{
					body: { comment: trimmedComment, rating },
					method: editingReviewId ? 'PATCH' : 'POST',
				},
			);

			setNotice(editingReviewId ? 'Your review was updated.' : 'Your review was published.');
			await loadReviews();
		} catch (saveError) {
			setError(saveError.message || 'Your review could not be saved.');
		} finally {
			setIsSaving(false);
		}
	};

	const editReview = (review) => {
		setEditingReviewId(review.id);
		setRating(review.rating);
		setComment(review.comment || '');
		setError('');
		setNotice('');
	};

	const cancelEdit = () => {
		if (ownReview) {
			setEditingReviewId(ownReview.id);
			setRating(ownReview.rating);
			setComment(ownReview.comment || '');
			return;
		}

		setEditingReviewId(null);
		setRating(5);
		setComment('');
	};

	const deleteReview = async (review) => {
		if (!window.confirm('Delete this review?')) return;

		setDeletingReviewId(review.id);
		setError('');
		setNotice('');

		try {
			await apiRequest(`${getReviewsUrl(bookId)}${review.id}/`, {
				method: 'DELETE',
			});
			setNotice('The review was deleted.');
			await loadReviews();
		} catch (deleteError) {
			setError(deleteError.message || 'The review could not be deleted.');
		} finally {
			setDeletingReviewId(null);
		}
	};

	return (
		<section className={styles.section} aria-labelledby="reviews-heading">
			<div className={styles.header}>
				<div>
					<span className={styles.kicker}>Community shelf</span>
					<h3 id="reviews-heading">Reader reviews</h3>
					<p>Share what this book meant to you.</p>
				</div>
				<div className={styles.summary}>
					<strong>{averageRating ? averageRating.toFixed(1) : '—'}</strong>
					<RatingStars value={Math.round(averageRating)} />
					<span>{reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
				</div>
			</div>

			{error && <p className={styles.error} role="alert">{error}</p>}
			{notice && <p className={styles.notice} role="status">{notice}</p>}

			{currentUser ? (
				<form className={styles.form} onSubmit={submitReview}>
					<div className={styles.formHeader}>
						<div>
							<strong>{editingReviewId ? 'Edit your review' : 'Leave a review'}</strong>
							<span>Signed in as {currentUser.username}</span>
						</div>
						<RatingStars value={rating} interactive onChange={setRating} />
					</div>
					<label className={styles.commentField}>
						<span>Your comment</span>
						<textarea
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							maxLength={2000}
							placeholder="What did you think about this book?"
							required
						/>
						<small>{comment.length}/2000</small>
					</label>
					<div className={styles.formActions}>
						{editingReviewId && <button type="button" className={styles.secondaryButton} onClick={cancelEdit}>Cancel</button>}
						<button type="submit" className={styles.submitButton} disabled={isSaving}>
							<IoSendOutline />
							{isSaving ? 'Saving...' : editingReviewId ? 'Update review' : 'Publish review'}
						</button>
					</div>
				</form>
			) : (
				<div className={styles.loginPrompt}>
					<div>
						<strong>Have an opinion?</strong>
						<span>Sign in to rate and review this book.</span>
					</div>
					<button type="button" onClick={onLoginClick}>Sign in to review</button>
				</div>
			)}

			<div className={styles.list}>
				{isLoading ? (
					<p className={styles.empty}>Loading reviews...</p>
				) : reviews.length ? (
					reviews.map((review) => (
						<article key={review.id} className={styles.reviewCard}>
							<div className={styles.reviewTopline}>
								<div>
									<strong>{review.username}</strong>
									<span>{formatReviewDate(review.updated_at || review.created_at)}</span>
								</div>
								<RatingStars value={review.rating} />
							</div>
							<p>{review.comment}</p>
							{(review.can_edit || review.can_delete) && (
								<div className={styles.reviewActions}>
									{review.can_edit && <button type="button" onClick={() => editReview(review)}><IoCreateOutline /> Edit</button>}
									{review.can_delete && <button type="button" onClick={() => deleteReview(review)} disabled={deletingReviewId === review.id}><IoTrashOutline /> {deletingReviewId === review.id ? 'Deleting...' : 'Delete'}</button>}
								</div>
							)}
						</article>
					))
				) : (
					<p className={styles.empty}>No reviews yet. Be the first reader to share an opinion.</p>
				)}
			</div>
		</section>
	);
}

RatingStars.propTypes = {
	value: PropTypes.number.isRequired,
	interactive: PropTypes.bool,
	onChange: PropTypes.func,
};

BookReviews.propTypes = {
	bookId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
	currentUser: PropTypes.shape({
		username: PropTypes.string,
	}),
	onLoginClick: PropTypes.func.isRequired,
};

export default BookReviews;
