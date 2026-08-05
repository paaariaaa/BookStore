import {
	IoBookOutline,
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

function Layout({ children, currentUser, onHomeClick, onLoginClick, onLogout, onRegisterClick }) {
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
					{currentUser ? (
						<div className={styles.accountCard}>
							<div className={styles.userAvatar}>{getInitials(currentUser.displayName)}</div>
							<div className={styles.accountText}>
								<strong>{currentUser.displayName}</strong>
								<span>{currentUser.username}</span>
							</div>
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

export default Layout
