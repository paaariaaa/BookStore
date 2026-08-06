import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
	IoAddOutline,
	IoAlbumsOutline,
	IoArrowBackOutline,
	IoBookOutline,
	IoCheckmarkCircleOutline,
	IoCloudDoneOutline,
	IoCloseOutline,
	IoCloudUploadOutline,
	IoCreateOutline,
	IoCubeOutline,
	IoDocumentTextOutline,
	IoEarthOutline,
	IoInformationCircleOutline,
	IoLibraryOutline,
	IoLinkOutline,
	IoOpenOutline,
	IoPeopleOutline,
	IoPricetagOutline,
	IoReaderOutline,
	IoRefreshOutline,
	IoSearchOutline,
	IoShieldCheckmarkOutline,
	IoSparklesOutline,
	IoTrashOutline,
	IoWarningOutline,
} from 'react-icons/io5';

import {
	apiRequest,
	formatToman,
	getArrayPayload,
	getSinglePayload,
	resolveMediaUrl,
} from '../services/api';
import styles from './AdminBooks.module.css';

const EMPTY_BOOK = {
	title: '',
	author: '',
	description: '',
	country: '',
	language: '',
	pages: '1',
	price: '',
	stock: '0',
	published_year: '',
	isbn: '',
	source_url: '',
};

const BOOK_FIELDS = Object.keys(EMPTY_BOOK);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
	if (error?.status === 403) return 'دسترسی ندارید';

	return error?.message || fallback;
};

const getBookForm = (book = {}) => BOOK_FIELDS.reduce((form, field) => ({
	...form,
	[field]: book[field] === null || book[field] === undefined ? EMPTY_BOOK[field] : String(book[field]),
}), {});

const buildBookPayload = (values, imageFile, currentBook) => {
	const payload = new FormData();

	BOOK_FIELDS.forEach((field) => {
		const value = values[field].trim();

		if (field === 'isbn' && !value && !currentBook?.isbn) return;
		payload.append(field, value);
	});
	if (imageFile) payload.append('image', imageFile);

	return payload;
};

const matchesFilter = (book, filter) => {
	const stock = Number(book.stock || 0);

	if (filter === 'low') return stock > 0 && stock <= 5;
	if (filter === 'sold') return stock === 0;

	return true;
};

export function AdminAccessGate({ isChecking }) {
	return (
		<main className={styles.accessGate} aria-live="polite">
			<div className={styles.accessBook} aria-hidden="true"><i /><i /><span /></div>
			<span>{isChecking ? 'VERIFYING STAFF ACCESS' : 'RETURNING TO THE BOOKSTORE'}</span>
			<h1>{isChecking ? 'Opening the private shelf…' : 'This shelf is for staff only.'}</h1>
		</main>
	);
}

AdminAccessGate.propTypes = {
	isChecking: PropTypes.bool.isRequired,
};

function AdminBooks({ onExit, onManageUsers, onOpenBook, refreshKey }) {
	const [books, setBooks] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [fetchError, setFetchError] = useState('');
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState('all');
	const [editorBook, setEditorBook] = useState(null);
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [form, setForm] = useState(EMPTY_BOOK);
	const [imageFile, setImageFile] = useState(null);
	const [imageError, setImageError] = useState('');
	const [isCoverDragActive, setIsCoverDragActive] = useState(false);
	const [formError, setFormError] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState('');
	const [notice, setNotice] = useState(null);
	const isEditing = Boolean(editorBook?.id);

	const loadBooks = useCallback(async () => {
		setIsLoading(true);
		setFetchError('');

		try {
			const payload = await apiRequest('/api/books/');
			setBooks(getArrayPayload(payload));
		} catch (error) {
			setFetchError(getErrorMessage(error, 'We could not load the catalog.'));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadBooks();
	}, [loadBooks, refreshKey]);

	useEffect(() => {
		if (!notice) return undefined;

		const timeoutId = window.setTimeout(() => setNotice(null), 4200);
		return () => window.clearTimeout(timeoutId);
	}, [notice]);

	useEffect(() => {
		if (!isEditorOpen && !deleteTarget) return undefined;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [deleteTarget, isEditorOpen]);

	useEffect(() => {
		const closeOnEscape = (event) => {
			if (event.key !== 'Escape') return;
			if (deleteTarget && !isDeleting) setDeleteTarget(null);
			else if (isEditorOpen && !isSaving) setIsEditorOpen(false);
		};

		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	}, [deleteTarget, isDeleting, isEditorOpen, isSaving]);

	const inventoryCount = useMemo(
		() => books.reduce((total, book) => total + Number(book.stock || 0), 0),
		[books],
	);
	const lowStockCount = useMemo(
		() => books.filter((book) => Number(book.stock || 0) <= 5).length,
		[books],
	);
	const visibleBooks = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return books.filter((book) => {
			const searchableText = [book.title, book.author, book.isbn, book.language]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			return (!normalizedQuery || searchableText.includes(normalizedQuery)) && matchesFilter(book, filter);
		});
	}, [books, filter, query]);
	const requiredFieldCount = useMemo(() => [
		Boolean(form.title.trim()),
		Boolean(form.author.trim()),
		form.pages !== '' && Number(form.pages) >= 1,
		form.price !== '' && Number(form.price) >= 0,
		form.stock !== '' && Number(form.stock) >= 0,
	].filter(Boolean).length, [form]);
	const completionPercent = requiredFieldCount * 20;
	const isIdentityComplete = Boolean(form.title.trim() && form.author.trim());

	const imagePreview = useMemo(() => (
		imageFile ? URL.createObjectURL(imageFile) : resolveMediaUrl(editorBook?.image)
	), [editorBook?.image, imageFile]);

	useEffect(() => () => {
		if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
	}, [imagePreview]);

	const openCreateEditor = () => {
		setEditorBook(null);
		setForm(EMPTY_BOOK);
		setImageFile(null);
		setImageError('');
		setIsCoverDragActive(false);
		setFormError('');
		setIsEditorOpen(true);
	};

	const openEditEditor = (book) => {
		setEditorBook(book);
		setForm(getBookForm(book));
		setImageFile(null);
		setImageError('');
		setIsCoverDragActive(false);
		setFormError('');
		setIsEditorOpen(true);
	};

	const closeEditor = () => {
		if (isSaving) return;
		setIsEditorOpen(false);
		setFormError('');
		setImageError('');
	};

	const changeForm = ({ target: { name, value } }) => {
		setForm((current) => ({ ...current, [name]: value }));
	};

	const applyImageFile = (file) => {
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			setImageError('Please choose a valid image file.');
			return;
		}

		if (file.size > MAX_IMAGE_SIZE) {
			setImageError('The cover image must be smaller than 8 MB.');
			return;
		}

		setImageError('');
		setImageFile(file);
	};

	const selectImage = ({ target: { files } }) => {
		applyImageFile(files?.[0]);
	};

	const dropImage = (event) => {
		event.preventDefault();
		setIsCoverDragActive(false);
		if (!isSaving) applyImageFile(event.dataTransfer.files?.[0]);
	};

	const submitBook = async (event) => {
		event.preventDefault();
		setFormError('');

		if (!form.title.trim() || !form.author.trim()) {
			setFormError('Title and author are required.');
			return;
		}

		setIsSaving(true);
		try {
			const savedPayload = await apiRequest(
				isEditing ? `/api/books/${editorBook.id}/` : '/api/books/',
				{
					method: isEditing ? 'PATCH' : 'POST',
					body: buildBookPayload(form, imageFile, editorBook),
				},
			);
			const savedBook = getSinglePayload(savedPayload);

			if (savedBook?.id) {
				setBooks((current) => isEditing
					? current.map((book) => String(book.id) === String(savedBook.id) ? savedBook : book)
					: [savedBook, ...current]);
			} else {
				await loadBooks();
			}

			setIsEditorOpen(false);
			setNotice({
				type: 'success',
				message: isEditing ? `“${form.title.trim()}” was updated.` : `“${form.title.trim()}” joined the shelf.`,
			});
		} catch (error) {
			setFormError(getErrorMessage(error, 'We could not save this book.'));
		} finally {
			setIsSaving(false);
		}
	};

	const askToDelete = (book) => {
		setDeleteError('');
		setDeleteTarget(book);
	};

	const deleteBook = async () => {
		if (!deleteTarget?.id) return;

		setIsDeleting(true);
		setDeleteError('');
		try {
			await apiRequest(`/api/books/${deleteTarget.id}/`, { method: 'DELETE' });
			setBooks((current) => current.filter((book) => String(book.id) !== String(deleteTarget.id)));
			setNotice({ type: 'success', message: `“${deleteTarget.title}” was removed from the catalog.` });
			setDeleteTarget(null);
		} catch (error) {
			setDeleteError(getErrorMessage(error, 'We could not delete this book.'));
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<main className={styles.adminPage}>
			<section className={styles.hero}>
				<div className={styles.heroCopy}>
					<button className={styles.backButton} type="button" onClick={onExit}>
						<IoArrowBackOutline /> Storefront
					</button>
					<span className={styles.kicker}><IoShieldCheckmarkOutline /> STAFF COLLECTION</span>
					<h1>Shape the next<br /><em>great shelf.</em></h1>
					<p>Keep every title, cover and copy in order from one calm editorial workspace.</p>
					<div className={styles.heroActions}>
						<button className={styles.heroAddButton} type="button" onClick={openCreateEditor}>
							<IoAddOutline /> Add a new book
						</button>
						<button className={styles.heroUsersButton} type="button" onClick={onManageUsers}>
							<IoPeopleOutline /> Manage members
						</button>
					</div>
				</div>
				<div className={styles.bookScene} aria-hidden="true">
					<div className={styles.sceneHalo} />
					<div className={styles.sceneBookOne}><span>CURATE</span></div>
					<div className={styles.sceneBookTwo}><IoLibraryOutline /></div>
					<div className={styles.sceneBookThree}><span>READ</span></div>
					<div className={styles.scenePages}><i /><i /><i /></div>
					<div className={styles.sceneShelf} />
				</div>
			</section>

			<section className={styles.stats} aria-label="Catalog overview">
				<article>
					<span className={styles.statIcon}><IoAlbumsOutline /></span>
					<div><small>Titles</small><strong>{books.length}</strong><p>in your catalog</p></div>
				</article>
				<article>
					<span className={styles.statIcon}><IoCubeOutline /></span>
					<div><small>Inventory</small><strong>{inventoryCount}</strong><p>copies available</p></div>
				</article>
				<article className={lowStockCount ? styles.warningStat : ''}>
					<span className={styles.statIcon}><IoWarningOutline /></span>
					<div><small>Attention</small><strong>{lowStockCount}</strong><p>low or out of stock</p></div>
				</article>
			</section>

			<section className={styles.catalog}>
				<div className={styles.catalogHeading}>
					<div>
						<span>CATALOG DESK</span>
						<h2>Book inventory</h2>
						<p>Edit the details readers see and keep stock accurate.</p>
					</div>
					<button className={styles.refreshButton} type="button" onClick={loadBooks} disabled={isLoading} aria-label="Refresh catalog">
						<IoRefreshOutline /> Refresh
					</button>
				</div>

				<div className={styles.toolbar}>
					<label className={styles.searchBox}>
						<IoSearchOutline />
						<input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search title, author, ISBN…"
							aria-label="Search catalog"
						/>
						{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><IoCloseOutline /></button>}
					</label>
					<div className={styles.filters} aria-label="Filter by stock">
						{[
							['all', 'All'],
							['low', 'Low stock'],
							['sold', 'Sold out'],
						].map(([value, label]) => (
							<button
								key={value}
								type="button"
								className={filter === value ? styles.activeFilter : ''}
								onClick={() => setFilter(value)}
							>{label}</button>
						))}
					</div>
				</div>

				<div className={styles.listHeader} aria-hidden="true">
					<span>Book</span><span>Details</span><span>Price</span><span>Stock</span><span>Actions</span>
				</div>

				{isLoading ? (
					<div className={styles.skeletonList} aria-label="Loading books">
						{[0, 1, 2, 3].map((item) => <i key={item} />)}
					</div>
				) : fetchError ? (
					<div className={styles.emptyState} role="alert">
						<IoWarningOutline />
						<h3>{fetchError}</h3>
						<p>Your catalog is unchanged. Check the connection and try once more.</p>
						<button type="button" onClick={loadBooks}><IoRefreshOutline /> Try again</button>
					</div>
				) : visibleBooks.length ? (
					<div className={styles.bookList}>
						{visibleBooks.map((book, index) => {
							const cover = resolveMediaUrl(book.image);
							const stock = Number(book.stock || 0);
							const stockClass = stock === 0 ? styles.outOfStock : stock <= 5 ? styles.lowStock : styles.inStock;

							return (
								<article className={styles.bookRow} key={book.id} style={{ '--row-delay': `${Math.min(index, 8) * 45}ms` }}>
									<button className={styles.bookIdentity} type="button" onClick={() => onOpenBook(book)}>
										<span className={styles.cover}>
											{cover ? <img src={cover} alt="" /> : <IoBookOutline />}
										</span>
										<span><strong>{book.title}</strong><small>{book.author || 'Unknown author'}</small></span>
									</button>
									<div className={styles.bookMeta}>
										<strong>{book.language || '—'}</strong>
										<span>{book.published_year || 'Year unknown'} · {book.pages || 0} pages</span>
									</div>
									<strong className={styles.bookPrice}>{formatToman(book.price)}</strong>
									<div className={`${styles.stockBadge} ${stockClass}`}><i />{stock} copies</div>
									<div className={styles.rowActions}>
										<button type="button" onClick={() => onOpenBook(book)} aria-label={`View ${book.title}`}><IoOpenOutline /></button>
										<button type="button" onClick={() => openEditEditor(book)} aria-label={`Edit ${book.title}`}><IoCreateOutline /></button>
										<button className={styles.deleteButton} type="button" onClick={() => askToDelete(book)} aria-label={`Delete ${book.title}`}><IoTrashOutline /></button>
									</div>
								</article>
							);
						})}
					</div>
				) : (
					<div className={styles.emptyState}>
						<IoLibraryOutline />
						<h3>{books.length ? 'No books match this view.' : 'Your catalog is ready for its first book.'}</h3>
						<p>{books.length ? 'Try a different search or stock filter.' : 'Add a title and begin building the shelf.'}</p>
						{books.length ? (
							<button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button>
						) : (
							<button type="button" onClick={openCreateEditor}><IoAddOutline /> Add first book</button>
						)}
					</div>
				)}
			</section>

			{isEditorOpen && (
				<div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
					<section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="book-editor-title" aria-describedby="book-editor-description">
						<header className={styles.editorHeader}>
							<div className={styles.editorHeading}>
								<span className={styles.editorMark}><IoSparklesOutline /></span>
								<div>
									<span>{isEditing ? 'EDIT CATALOG ENTRY' : 'NEW CATALOG ENTRY'}</span>
									<h2 id="book-editor-title">{isEditing ? 'Refine this edition' : 'Welcome a new story'}</h2>
									<p id="book-editor-description">Build a polished shelf card while previewing the book as readers will meet it.</p>
								</div>
							</div>
							<div className={styles.editorHeaderTools}>
								<div className={styles.editorProgress} aria-label={`${requiredFieldCount} of 5 required fields complete`}>
									<span><strong>{requiredFieldCount}/5</strong> essentials ready</span>
									<i><b style={{ width: `${completionPercent}%` }} /></i>
								</div>
								<button type="button" onClick={closeEditor} disabled={isSaving} aria-label="Close editor"><IoCloseOutline /></button>
							</div>
						</header>

						<form className={styles.editorBody} onSubmit={submitBook}>
							<aside className={styles.coverEditor}>
								<div className={styles.coverEditorIntro}>
									<span>LIVE SHELF PREVIEW</span>
									<p>Your cover and key details update as you type.</p>
								</div>
								<div className={styles.coverStage}>
									<div className={styles.coverPreview}>
										{imagePreview ? (
											<img src={imagePreview} alt={`${form.title || 'Selected book'} cover preview`} />
										) : (
											<div className={styles.emptyCover}>
												<IoBookOutline />
												<strong>{form.title.trim() || 'Untitled story'}</strong>
												<span>{form.author.trim() || 'Author name'}</span>
											</div>
										)}
										<span className={styles.coverEdition}>{form.published_year || 'NEW'}</span>
									</div>
									<div className={styles.coverShadow} aria-hidden="true" />
								</div>
								<div className={styles.previewIdentity}>
									<strong title={form.title}>{form.title.trim() || 'Your next catalog title'}</strong>
									<span>{form.author.trim() ? `by ${form.author.trim()}` : 'Author will appear here'}</span>
								</div>
								<div
									className={`${styles.uploadDropzone} ${isCoverDragActive ? styles.uploadDropzoneActive : ''}`}
									onDragEnter={(event) => { event.preventDefault(); if (!isSaving) setIsCoverDragActive(true); }}
									onDragOver={(event) => event.preventDefault()}
									onDragLeave={() => setIsCoverDragActive(false)}
									onDrop={dropImage}
								>
									<span className={styles.uploadGlyph}><IoCloudUploadOutline /></span>
									<div>
										<strong>{isCoverDragActive ? 'Release to add the cover' : imageFile ? 'Choose a different cover' : isEditing ? 'Replace the current cover' : 'Add a cover image'}</strong>
										<small>Drop it here or <label>browse<input type="file" accept="image/*" onChange={selectImage} onClick={(event) => { event.currentTarget.value = ''; }} disabled={isSaving} /></label></small>
									</div>
								</div>
								{imageFile ? (
									<div className={styles.imageFileCard}>
										<IoCloudDoneOutline />
										<span><strong>{imageFile.name}</strong><small>{(imageFile.size / (1024 * 1024)).toFixed(1)} MB · ready to upload</small></span>
										<button type="button" onClick={() => { setImageFile(null); setImageError(''); }} aria-label="Remove selected cover"><IoCloseOutline /></button>
									</div>
				) : (
					<p className={styles.imageHint}><IoInformationCircleOutline /> JPG, PNG or WebP · max 8 MB</p>
				)}
				{imageError && <p className={styles.imageError} role="alert"><IoWarningOutline /> {imageError}</p>}
				<div className={styles.previewFacts}>
									<span><small>PRICE</small><strong>{form.price === '' ? 'Not set' : formatToman(form.price)}</strong></span>
									<span><small>STOCK</small><strong>{form.stock || '0'} copies</strong></span>
									<span><small>LANGUAGE</small><strong>{form.language.trim() || 'Not set'}</strong></span>
								</div>
							</aside>

							<div className={styles.formPanel}>
								<div className={styles.formLead}>
									<div>
										<span>GUIDED CATALOG ENTRY</span>
										<h3>Everything readers need, arranged clearly.</h3>
										<p>Required fields are marked with an asterisk. Optional details make discovery easier.</p>
									</div>
									<span className={`${styles.readinessBadge} ${requiredFieldCount === 5 ? styles.readinessBadgeReady : ''}`}>
										{requiredFieldCount === 5 ? <IoCheckmarkCircleOutline /> : <IoReaderOutline />}
										{requiredFieldCount === 5 ? 'Ready for the shelf' : `${5 - requiredFieldCount} essentials left`}
									</span>
								</div>

								<section className={`${styles.formSection} ${isIdentityComplete ? styles.formSectionComplete : ''}`}>
									<header className={styles.formSectionHeading}>
										<span className={styles.sectionNumber}>01</span>
										<div><strong>Book identity</strong><small>The details readers recognize first.</small></div>
										{isIdentityComplete && <IoCheckmarkCircleOutline />}
									</header>
									<div className={styles.formGrid}>
										<label className={styles.wideField}><span>Title <b>*</b></span><input name="title" value={form.title} onChange={changeForm} placeholder="The name on the cover" required disabled={isSaving} autoFocus /></label>
										<label><span>Author <b>*</b></span><input name="author" value={form.author} onChange={changeForm} placeholder="Author name" required disabled={isSaving} /></label>
										<label><span>ISBN</span><input name="isbn" value={form.isbn} onChange={changeForm} placeholder="Up to 13 characters" maxLength={13} disabled={isSaving} /></label>
									</div>
								</section>

								<section className={styles.formSection}>
									<header className={styles.formSectionHeading}>
										<span className={styles.sectionNumber}>02</span>
										<div><strong>Edition & origin</strong><small>Place this edition in its publishing context.</small></div>
										<IoEarthOutline />
									</header>
									<div className={styles.formGrid}>
										<label><span>Country</span><input name="country" value={form.country} onChange={changeForm} placeholder="Country of origin" disabled={isSaving} /></label>
										<label><span>Language</span><input name="language" value={form.language} onChange={changeForm} placeholder="Book language" disabled={isSaving} /></label>
										<label><span>Pages <b>*</b></span><input type="number" name="pages" value={form.pages} onChange={changeForm} min="1" step="1" required disabled={isSaving} /></label>
										<label><span>Published year</span><input type="number" name="published_year" value={form.published_year} onChange={changeForm} min="1" max={new Date().getFullYear() + 1} step="1" placeholder="e.g. 2025" disabled={isSaving} /></label>
									</div>
								</section>

								<section className={styles.formSection}>
									<header className={styles.formSectionHeading}>
										<span className={styles.sectionNumber}>03</span>
										<div><strong>Store details</strong><small>Set availability, value and reference.</small></div>
										<IoPricetagOutline />
									</header>
									<div className={styles.formGrid}>
										<label><span>Price <b>*</b></span><div className={styles.suffixedInput}><IoPricetagOutline /><input type="number" name="price" value={form.price} onChange={changeForm} min="0" step="0.01" placeholder="0" required disabled={isSaving} /><small>T</small></div></label>
										<label><span>Stock <b>*</b></span><div className={styles.suffixedInput}><IoCubeOutline /><input type="number" name="stock" value={form.stock} onChange={changeForm} min="0" step="1" required disabled={isSaving} /><small>copies</small></div></label>
										<label className={styles.wideField}><span>Source URL</span><div className={styles.prefixedInput}><IoLinkOutline /><input type="url" name="source_url" value={form.source_url} onChange={changeForm} placeholder="https://example.com/book" disabled={isSaving} /></div></label>
									</div>
								</section>

								<section className={styles.formSection}>
									<header className={styles.formSectionHeading}>
										<span className={styles.sectionNumber}>04</span>
										<div><strong>Reader introduction</strong><small>Give readers a thoughtful reason to open it.</small></div>
										<IoDocumentTextOutline />
									</header>
									<div className={styles.formGrid}>
										<label className={styles.wideField}><span>Description <small>{form.description.length} characters</small></span><textarea name="description" value={form.description} onChange={changeForm} rows="5" placeholder="A clear, inviting summary for readers..." disabled={isSaving} /></label>
									</div>
								</section>

								{formError && <p className={styles.formError} role="alert"><IoWarningOutline /> <span>{formError}</span></p>}
								<footer className={styles.formActions}>
									<div className={styles.saveAssurance}>
										<IoShieldCheckmarkOutline />
										<span><strong>Secure staff update</strong><small>Saved directly to the bookstore catalog.</small></span>
									</div>
									<div className={styles.actionButtons}>
										<button type="button" onClick={closeEditor} disabled={isSaving}>Cancel</button>
										<button className={styles.saveButton} type="submit" disabled={isSaving}>
											{isSaving ? <span className={styles.buttonSpinner} /> : <IoCheckmarkCircleOutline />}
											{isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add to catalog'}
										</button>
									</div>
								</footer>
							</div>
						</form>
					</section>
				</div>
			)}

			{deleteTarget && (
				<div className={`${styles.modalBackdrop} ${styles.confirmBackdrop}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isDeleting && setDeleteTarget(null)}>
					<section className={styles.deleteDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
						<div className={styles.deleteIcon}><IoTrashOutline /></div>
						<span>REMOVE FROM CATALOG</span>
						<h2 id="delete-title">Let this book leave the shelf?</h2>
						<p id="delete-description"><strong>“{deleteTarget.title}”</strong> will be permanently removed. This cannot be undone.</p>
						{deleteError && <p className={styles.deleteError} role="alert">{deleteError}</p>}
						<div className={styles.deleteActions}>
							<button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Keep book</button>
							<button type="button" onClick={deleteBook} disabled={isDeleting}>{isDeleting ? 'Removing…' : 'Remove permanently'}</button>
						</div>
					</section>
				</div>
			)}

			{notice && (
				<div className={styles.toast} role="status">
					<IoCheckmarkCircleOutline />
					<div><strong>Catalog updated</strong><span>{notice.message}</span></div>
					<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><IoCloseOutline /></button>
				</div>
			)}
		</main>
	);
}

AdminBooks.propTypes = {
	onExit: PropTypes.func.isRequired,
	onManageUsers: PropTypes.func.isRequired,
	onOpenBook: PropTypes.func.isRequired,
	refreshKey: PropTypes.number.isRequired,
};

export default AdminBooks;
