import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	IoArrowBackOutline,
	IoBookOutline,
	IoCalendarOutline,
	IoCheckmarkCircleOutline,
	IoChevronDownOutline,
	IoCloseCircleOutline,
	IoCloseOutline,
	IoFilterOutline,
	IoKeyOutline,
	IoLibraryOutline,
	IoLockClosedOutline,
	IoMailOutline,
	IoPeopleOutline,
	IoPersonOutline,
	IoPowerOutline,
	IoRefreshOutline,
	IoSaveOutline,
	IoSearchOutline,
	IoShieldCheckmarkOutline,
	IoSwapHorizontalOutline,
	IoWarningOutline,
} from 'react-icons/io5';

import { apiRequest, getArrayPayload, getSinglePayload } from '../services/api';
import styles from './AdminUsers.module.css';

const ROLE_OPTIONS = [
	{ label: 'Admin', value: 'admin' },
	{ label: 'Customer', value: 'customer' },
];

const formatJoinedDate = (value) => {
	if (!value) return 'Unknown date';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Unknown date';

	return new Intl.DateTimeFormat('en-US', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(date);
};

const getInitials = (user = {}) => {
	const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User';

	return displayName
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase();
};

const getDisplayName = (user = {}) => (
	`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unnamed member'
);

const getManagementError = (error, fallback) => {
	if (error?.status === 403) return 'Only a superadmin can change user roles or account status.';

	return error?.message || fallback;
};

function AdminUsers({ currentUser, onBooksClick, onCurrentUserResolved, onExit }) {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [fetchError, setFetchError] = useState('');
	const [query, setQuery] = useState('');
	const [roleFilter, setRoleFilter] = useState('all');
	const [statusFilter, setStatusFilter] = useState('all');
	const [draftRoles, setDraftRoles] = useState({});
	const [pendingUsers, setPendingUsers] = useState({});
	const [rowErrors, setRowErrors] = useState({});
	const [statusTarget, setStatusTarget] = useState(null);
	const [notice, setNotice] = useState(null);

	const loadUsers = useCallback(async () => {
		setIsLoading(true);
		setFetchError('');

		try {
			const payload = await apiRequest('/api/auth/users/');
			const userList = getArrayPayload(payload);
			const signedInAccount = userList.find((user) => String(user.id) === String(currentUser?.id));

			setUsers(userList);
			setDraftRoles({});
			setRowErrors({});
			if (signedInAccount) onCurrentUserResolved(signedInAccount);
		} catch (error) {
			setFetchError(getManagementError(error, 'We could not open the member directory.'));
		} finally {
			setIsLoading(false);
		}
	}, [currentUser?.id, onCurrentUserResolved]);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	useEffect(() => {
		if (!notice) return undefined;

		const timeoutId = window.setTimeout(() => setNotice(null), 4200);
		return () => window.clearTimeout(timeoutId);
	}, [notice]);

	useEffect(() => {
		if (!statusTarget) return undefined;

		const previousOverflow = document.body.style.overflow;
		const closeOnEscape = (event) => {
			if (event.key === 'Escape' && !pendingUsers[statusTarget.id]) setStatusTarget(null);
		};

		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', closeOnEscape);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', closeOnEscape);
		};
	}, [pendingUsers, statusTarget]);

	const currentAccount = users.find((user) => String(user.id) === String(currentUser?.id));
	const canManageUsers = Boolean(currentAccount?.is_superuser);
	const activeCount = useMemo(() => users.filter((user) => user.is_active).length, [users]);
	const adminCount = useMemo(
		() => users.filter((user) => user.role === 'admin' || user.role === 'superadmin').length,
		[users],
	);
	const customerCount = useMemo(() => users.filter((user) => user.role === 'customer').length, [users]);
	const visibleUsers = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return users.filter((user) => {
			const matchesQuery = !normalizedQuery || [
				user.username,
				user.email,
				user.first_name,
				user.last_name,
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
				.includes(normalizedQuery);
			const matchesRole = roleFilter === 'all'
				|| (roleFilter === 'staff' && (user.role === 'admin' || user.role === 'superadmin'))
				|| user.role === roleFilter;
			const matchesStatus = statusFilter === 'all'
				|| (statusFilter === 'active' && user.is_active)
				|| (statusFilter === 'inactive' && !user.is_active);

			return matchesQuery && matchesRole && matchesStatus;
		});
	}, [query, roleFilter, statusFilter, users]);

	const patchUser = async (user, changes, successMessage) => {
		setPendingUsers((current) => ({ ...current, [user.id]: true }));
		setRowErrors((current) => ({ ...current, [user.id]: '' }));

		try {
			const payload = await apiRequest(`/api/auth/users/${user.id}/`, {
				body: changes,
				method: 'PATCH',
			});
			const updatedUser = getSinglePayload(payload);

			if (!updatedUser?.id) throw new Error('The server did not return the updated user.');

			setUsers((current) => current.map((item) => (
				String(item.id) === String(updatedUser.id) ? updatedUser : item
			)));
			setDraftRoles((current) => {
				const next = { ...current };
				delete next[user.id];
				return next;
			});
			setNotice({ message: successMessage, userId: updatedUser.id });
			if (String(updatedUser.id) === String(currentUser?.id)) onCurrentUserResolved(updatedUser);

			return true;
		} catch (error) {
			setRowErrors((current) => ({
				...current,
				[user.id]: getManagementError(error, 'This account could not be updated.'),
			}));
			return false;
		} finally {
			setPendingUsers((current) => ({ ...current, [user.id]: false }));
		}
	};

	const saveRole = async (user) => {
		const nextRole = draftRoles[user.id] || user.role;

		if (nextRole === user.role) return;
		await patchUser(
			user,
			{ role: nextRole },
			`${user.username} is now ${nextRole === 'admin' ? 'an admin' : 'a customer'}.`,
		);
	};

	const changeStatus = async (user, isActive) => {
		const wasUpdated = await patchUser(
			user,
			{ is_active: isActive },
			isActive
				? `${user.username}'s account is active again.`
				: `${user.username}'s account was deactivated.`,
		);

		if (wasUpdated) setStatusTarget(null);
	};

	const clearFilters = () => {
		setQuery('');
		setRoleFilter('all');
		setStatusFilter('all');
	};

	return (
		<main className={styles.usersPage}>
			<section className={styles.hero}>
				<div className={styles.heroCopy}>
					<div className={styles.topActions}>
						<button type="button" onClick={onExit}><IoArrowBackOutline /> Storefront</button>
						<button type="button" onClick={onBooksClick}><IoBookOutline /> Book desk</button>
					</div>
					<span className={styles.kicker}><IoShieldCheckmarkOutline /> MEMBER LEDGER</span>
					<h1>Care for every<br /><em>reader account.</em></h1>
					<p>See who belongs to the bookstore, keep access clear and protect every administrative role.</p>
					<div className={styles.accessNote}>
						{canManageUsers ? <IoKeyOutline /> : <IoLockClosedOutline />}
						<span>
							<strong>{canManageUsers ? 'Superadmin controls unlocked' : 'Read-only staff view'}</strong>
							<small>{canManageUsers ? 'You can update customer and admin accounts.' : 'Only a superadmin can change roles or status.'}</small>
						</span>
					</div>
				</div>
				<div className={styles.ledgerScene} aria-hidden="true">
					<div className={styles.sceneGlow} />
					<div className={styles.memberCardOne}><IoPersonOutline /><span>READER</span></div>
					<div className={styles.memberCardTwo}><IoLibraryOutline /><span>BOOK APP</span></div>
					<div className={styles.memberCardThree}><IoKeyOutline /><span>STAFF</span></div>
					<div className={styles.sceneShelf} />
				</div>
			</section>

			<section className={styles.stats} aria-label="User overview">
				<article><span><IoPeopleOutline /></span><div><small>Members</small><strong>{users.length}</strong><p>registered accounts</p></div></article>
				<article><span><IoCheckmarkCircleOutline /></span><div><small>Active</small><strong>{activeCount}</strong><p>can sign in</p></div></article>
				<article><span><IoShieldCheckmarkOutline /></span><div><small>Staff</small><strong>{adminCount}</strong><p>privileged accounts</p></div></article>
				<article><span><IoBookOutline /></span><div><small>Readers</small><strong>{customerCount}</strong><p>customer accounts</p></div></article>
			</section>

			<section className={styles.directory}>
				<header className={styles.directoryHeader}>
					<div>
						<span>ACCOUNT CATALOGUE</span>
						<h2>Readers & staff</h2>
						<p>Changes are written directly to the authenticated user account.</p>
					</div>
					<button className={styles.refreshButton} type="button" onClick={loadUsers} disabled={isLoading}>
						<IoRefreshOutline /> Refresh directory
					</button>
				</header>

				<div className={styles.toolbar}>
					<label className={styles.searchBox}>
						<IoSearchOutline />
						<input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search name, username or email..."
							aria-label="Search users"
						/>
						{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><IoCloseOutline /></button>}
					</label>
					<div className={styles.filterGroup}>
						<IoFilterOutline />
						<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role">
							<option value="all">All roles</option>
							<option value="staff">Staff</option>
							<option value="customer">Customers</option>
						</select>
						<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by account status">
							<option value="all">Any status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>
				</div>

				<div className={styles.listHeader} aria-hidden="true">
					<span>Member</span><span>Email</span><span>Role</span><span>Status</span><span>Joined</span><span>Controls</span>
				</div>

				{isLoading ? (
					<div className={styles.skeletonList} aria-label="Loading users">
						{[0, 1, 2, 3, 4].map((item) => <i key={item} />)}
					</div>
				) : fetchError ? (
					<div className={styles.emptyState} role="alert">
						<IoWarningOutline />
						<h3>The member ledger stayed closed.</h3>
						<p>{fetchError}</p>
						<button type="button" onClick={loadUsers}><IoRefreshOutline /> Try again</button>
					</div>
				) : visibleUsers.length ? (
					<div className={styles.userList}>
						{visibleUsers.map((user, index) => {
							const isSuperadmin = user.role === 'superadmin' || user.is_superuser;
							const canEditRow = canManageUsers && !isSuperadmin;
							const selectedRole = draftRoles[user.id] || user.role;
							const roleHasChanged = selectedRole !== user.role;
							const isPending = Boolean(pendingUsers[user.id]);
							const isCurrentUser = String(user.id) === String(currentUser?.id);

							return (
								<article
									className={`${styles.userRow} ${notice?.userId === user.id ? styles.userRowUpdated : ''}`}
									key={user.id}
									style={{ '--user-delay': `${Math.min(index, 8) * 35}ms` }}
								>
									<div className={styles.userIdentity} data-label="Member">
										<span className={`${styles.avatar} ${isSuperadmin ? styles.avatarSuperadmin : user.role === 'admin' ? styles.avatarAdmin : ''}`}>{getInitials(user)}</span>
										<span><strong>{getDisplayName(user)}</strong><small>@{user.username}{isCurrentUser ? ' · You' : ''}</small></span>
									</div>
									<div className={styles.emailCell} data-label="Email"><IoMailOutline /><span title={user.email || 'No email provided'}>{user.email || 'No email provided'}</span></div>
									<div className={styles.roleCell} data-label="Role">
										{canEditRow ? (
											<div className={styles.roleEditor}>
												<label className={styles.roleSelect}>
													<select
														value={selectedRole}
														onChange={(event) => setDraftRoles((current) => ({ ...current, [user.id]: event.target.value }))}
														disabled={isPending}
														aria-label={`Role for ${user.username}`}
													>
														{ROLE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
													</select>
													<IoChevronDownOutline />
												</label>
												{roleHasChanged && (
													<button className={styles.saveRoleButton} type="button" onClick={() => saveRole(user)} disabled={isPending} aria-label={`Save role for ${user.username}`}>
														{isPending ? <span className={styles.spinner} /> : <IoSaveOutline />}
													</button>
												)}
											</div>
										) : (
											<span className={`${styles.roleBadge} ${isSuperadmin ? styles.superadminBadge : user.role === 'admin' ? styles.adminBadge : styles.customerBadge}`}>
												{isSuperadmin ? <IoKeyOutline /> : user.role === 'admin' ? <IoShieldCheckmarkOutline /> : <IoBookOutline />}
												{isSuperadmin ? 'Superadmin' : user.role === 'admin' ? 'Admin' : 'Customer'}
											</span>
										)}
									</div>
									<div className={styles.statusCell} data-label="Status">
										<span className={user.is_active ? styles.activeStatus : styles.inactiveStatus}><i />{user.is_active ? 'Active' : 'Inactive'}</span>
									</div>
									<div className={styles.joinedCell} data-label="Joined"><IoCalendarOutline />{formatJoinedDate(user.date_joined)}</div>
									<div className={styles.controlsCell} data-label="Controls">
										{canEditRow ? (
											<button
												className={`${styles.statusButton} ${user.is_active ? styles.deactivateButton : styles.activateButton}`}
												type="button"
												onClick={() => user.is_active ? setStatusTarget(user) : changeStatus(user, true)}
												disabled={isPending}
											>
												{isPending ? <span className={styles.spinner} /> : user.is_active ? <IoPowerOutline /> : <IoCheckmarkCircleOutline />}
												{user.is_active ? 'Deactivate' : 'Activate'}
											</button>
										) : (
											<span className={styles.readOnlyLabel}><IoLockClosedOutline /> {isSuperadmin ? 'Protected' : 'Read only'}</span>
										)}
									</div>
									{rowErrors[user.id] && <p className={styles.rowError} role="alert"><IoWarningOutline /> {rowErrors[user.id]}</p>}
								</article>
							);
						})}
					</div>
				) : (
					<div className={styles.emptyState}>
						<IoPeopleOutline />
						<h3>No member matches this view.</h3>
						<p>Try a different name, role or account status.</p>
						<button type="button" onClick={clearFilters}><IoSwapHorizontalOutline /> Clear filters</button>
					</div>
				)}
			</section>

			{statusTarget && (
				<div className={styles.confirmBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !pendingUsers[statusTarget.id] && setStatusTarget(null)}>
					<section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="deactivate-title" aria-describedby="deactivate-description">
						<span className={styles.confirmIcon}><IoPowerOutline /></span>
						<small>ACCOUNT ACCESS</small>
						<h2 id="deactivate-title">Deactivate this reader?</h2>
						<p id="deactivate-description"><strong>{statusTarget.username}</strong> will be unable to log in, and existing API authentication will be rejected.</p>
						{rowErrors[statusTarget.id] && <p className={styles.confirmError}><IoWarningOutline /> {rowErrors[statusTarget.id]}</p>}
						<div>
							<button type="button" onClick={() => setStatusTarget(null)} disabled={pendingUsers[statusTarget.id]}>Keep active</button>
							<button type="button" onClick={() => changeStatus(statusTarget, false)} disabled={pendingUsers[statusTarget.id]}>
								{pendingUsers[statusTarget.id] ? <span className={styles.spinner} /> : <IoCloseCircleOutline />}
								Deactivate account
							</button>
						</div>
					</section>
				</div>
			)}

			{notice && (
				<div className={styles.toast} role="status">
					<IoCheckmarkCircleOutline />
					<span><strong>Member updated</strong><small>{notice.message}</small></span>
					<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><IoCloseOutline /></button>
				</div>
			)}
		</main>
	);
}

AdminUsers.propTypes = {
	currentUser: PropTypes.shape({
		id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		is_staff: PropTypes.bool,
		is_superuser: PropTypes.bool,
	}).isRequired,
	onBooksClick: PropTypes.func.isRequired,
	onCurrentUserResolved: PropTypes.func.isRequired,
	onExit: PropTypes.func.isRequired,
};

export default AdminUsers;
