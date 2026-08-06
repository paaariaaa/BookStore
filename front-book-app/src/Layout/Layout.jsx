import PropTypes from 'prop-types';
import {
	IoBookOutline,
	IoBagHandleOutline,
	IoChevronForwardOutline,
	IoLibraryOutline,
	IoLogInOutline,
	IoLogOutOutline,
	IoPersonCircleOutline,
} from 'react-icons/io5';

import styles from './Layout.module.css'

const getInitials = (name = '') => {
	const initials = name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((item) => item[0])
		.join('');

	return initials || 'B';
}

function Layout({ cartCount, children, currentUser, isAdminRoute, isProfileOpen, onAdminClick, onCartClick, onHomeClick, onLoginClick, onLogout, onProfileClick, onRegisterClick }) {
	return (
		<>
			<header className={styles.header}>
				<button className={styles.brand} type="button" onClick={onHomeClick}>
					<IoLibraryOutline />
					<span>
						<strong>Book app</strong>
						<small>Open shelf</small>
					</span>
				</button>

				<div className={styles.headerTools}>
					<button className={styles.cartButton} type="button" onClick={onCartClick} aria-label={`Open shopping cart with ${cartCount} items`}>
						<IoBagHandleOutline />
						<span>Cart</span>
						<b className={cartCount ? styles.cartCountActive : ''}>{cartCount}</b>
					</button>
					{currentUser?.is_staff === true && (
						<button
							className={`${styles.adminButton} ${isAdminRoute ? styles.adminButtonActive : ''}`}
							type="button"
							onClick={onAdminClick}
							aria-current={isAdminRoute ? 'page' : undefined}
						>
							<span className={styles.adminGlyph}><IoBookOutline /></span>
							<span className={styles.adminCopy}><small>STAFF SPACE</small><strong>Books & members</strong></span>
							<IoChevronForwardOutline />
						</button>
					)}
					{currentUser ? (
						<div className={styles.accountCard}>
							<button
								className={styles.profileTrigger}
								type="button"
								onClick={onProfileClick}
								aria-label={`Open ${currentUser.displayName}'s reader profile`}
								aria-haspopup="dialog"
								aria-expanded={isProfileOpen}
							>
								<div className={styles.userAvatar}>{getInitials(currentUser.displayName)}</div>
								<div className={styles.accountText}>
									<strong>{currentUser.displayName}</strong>
									<span>{currentUser.username ? `@${currentUser.username}` : 'Reader profile'}</span>
								</div>
								<span className={styles.profileArrow}><IoChevronForwardOutline /></span>
							</button>
							<button className={styles.logoutButton} type="button" onClick={onLogout}>
								<IoLogOutOutline />
								Logout
							</button>
						</div>
					) : (
						<div className={styles.accountCard}>
							<div className={styles.guestAvatar}>
								<IoPersonCircleOutline />
							</div>
							<div className={styles.accountText}>
								<strong>Guest reader</strong>
								<span>Browsing</span>
							</div>
							<button className={styles.loginButton} type="button" onClick={onLoginClick}>
								<IoLogInOutline />
								Login
							</button>
							<button className={styles.joinButton} type="button" onClick={onRegisterClick}>
								<IoBookOutline />
								Join
							</button>
						</div>
					)}
				</div>
			</header>
			{children}
			<footer className={styles.footer}>Developed with &hearts;</footer>
		</>
	)
}

Layout.propTypes = {
	cartCount: PropTypes.number.isRequired,
	children: PropTypes.node.isRequired,
	currentUser: PropTypes.shape({
		displayName: PropTypes.string.isRequired,
		is_staff: PropTypes.bool,
		username: PropTypes.string.isRequired,
	}),
	isAdminRoute: PropTypes.bool.isRequired,
	isProfileOpen: PropTypes.bool.isRequired,
	onAdminClick: PropTypes.func.isRequired,
	onHomeClick: PropTypes.func.isRequired,
	onCartClick: PropTypes.func.isRequired,
	onLoginClick: PropTypes.func.isRequired,
	onLogout: PropTypes.func.isRequired,
	onProfileClick: PropTypes.func.isRequired,
	onRegisterClick: PropTypes.func.isRequired,
};

export default Layout
