import { useEffect, useState } from 'react';
import {
	IoBookOutline,
	IoBookmarkOutline,
	IoEnterOutline,
	IoEyeOffOutline,
	IoEyeOutline,
	IoLibraryOutline,
	IoLockClosedOutline,
	IoMailOutline,
	IoPersonOutline,
	IoReaderOutline,
	IoSparklesOutline,
} from 'react-icons/io5';

import styles from './AuthBook.module.css';

const initialLoginData = {
	username: '',
	password: '',
};

const initialRegisterData = {
	username: '',
	email: '',
	firstname: '',
	lastname: '',
	password: '',
	confirmPassword: '',
};

const registerFields = [
	{
		name: 'username',
		label: 'Username',
		type: 'text',
		autoComplete: 'username',
		icon: IoPersonOutline,
	},
	{
		name: 'email',
		label: 'Email',
		type: 'email',
		autoComplete: 'email',
		icon: IoMailOutline,
	},
	{
		name: 'firstname',
		label: 'First name',
		type: 'text',
		autoComplete: 'given-name',
		icon: IoReaderOutline,
	},
	{
		name: 'lastname',
		label: 'Last name',
		type: 'text',
		autoComplete: 'family-name',
		icon: IoReaderOutline,
	},
	{
		name: 'password',
		label: 'Password',
		type: 'password',
		autoComplete: 'new-password',
		icon: IoLockClosedOutline,
	},
	{
		name: 'confirmPassword',
		label: 'Confirm password',
		type: 'password',
		autoComplete: 'new-password',
		icon: IoLockClosedOutline,
	},
];

const getInitialMode = () => {
	if (typeof window === 'undefined') return 'login';

	return window.location.pathname.includes('register') ? 'register' : 'login';
};

function AuthBook({ authMode = getInitialMode(), onLogin, onNavigate, onRegister }) {
	const [mode, setMode] = useState(authMode);
	const [loginData, setLoginData] = useState(initialLoginData);
	const [registerData, setRegisterData] = useState(initialRegisterData);
	const [showPassword, setShowPassword] = useState(false);
	const [loginSubmitted, setLoginSubmitted] = useState(false);
	const [registerSubmitted, setRegisterSubmitted] = useState(false);
	const [loginError, setLoginError] = useState('');
	const [registerError, setRegisterError] = useState('');
	const [activeRequest, setActiveRequest] = useState('');
	const [hasTurned, setHasTurned] = useState(false);

	const isRegisterMode = mode === 'register';
	const passwordsMatch = registerData.password === registerData.confirmPassword;
	const isLoginSubmitting = activeRequest === 'login';
	const isRegisterSubmitting = activeRequest === 'register';
	const showRegisterError = (registerSubmitted && !passwordsMatch) || Boolean(registerError);
	const showRegisterSuccess = registerSubmitted && passwordsMatch && !registerError && !isRegisterSubmitting;

	useEffect(() => {
		setMode(authMode);
	}, [authMode]);

	const switchMode = (nextMode) => {
		if (nextMode === mode) return;

		setHasTurned(true);
		setMode(nextMode);
		setLoginError('');
		setRegisterError('');
		onNavigate?.(`/${nextMode}`);
	}

	const loginChangeHandler = (event) => {
		const { name, value } = event.target;

		setLoginData((currentLoginData) => ({
			...currentLoginData,
			[name]: value,
		}));
	}

	const registerChangeHandler = (event) => {
		const { name, value } = event.target;

		setRegisterData((currentRegisterData) => ({
			...currentRegisterData,
			[name]: value,
		}));
	}

	const loginSubmitHandler = async (event) => {
		event.preventDefault();
		const username = loginData.username.trim();

		if (!username) return;

		setActiveRequest('login');
		setLoginError('');
		setLoginSubmitted(false);

		try {
			await onLogin({ password: loginData.password, username });
			setLoginSubmitted(true);
		} catch (error) {
			setLoginError(error.message || 'Could not unlock your shelf.');
		} finally {
			setActiveRequest('');
		}
	}

	const registerSubmitHandler = async (event) => {
		event.preventDefault();
		setRegisterSubmitted(true);
		setRegisterError('');

		if (!passwordsMatch) return;

		setActiveRequest('register');

		try {
			await onRegister({
				confirmPassword: registerData.confirmPassword,
				email: registerData.email.trim(),
				firstname: registerData.firstname.trim(),
				lastname: registerData.lastname.trim(),
				password: registerData.password,
				username: registerData.username.trim(),
			});
		} catch (error) {
			setRegisterError(error.message || 'Could not create your library card.');
		} finally {
			setActiveRequest('');
		}
	}

	return (
		<main className={styles.auth}>
			<div className={styles.ambientPages} aria-hidden="true">
				<span />
				<span />
				<span />
			</div>

			<section className={`${styles.book} ${isRegisterMode ? styles.registerMode : ''}`}>
				<aside className={styles.cover}>
					<div className={styles.bookmark}>
						<IoBookmarkOutline />
						<span>{isRegisterMode ? 'New chapter' : 'Private shelf'}</span>
					</div>

					<div className={styles.coverTitle}>
						<IoLibraryOutline />
						<h2>{isRegisterMode ? 'Open your library card' : 'Unlock your shelf'}</h2>
						<p>{isRegisterMode ? 'One clean card for every favorite book.' : 'A quiet doorway back to your books.'}</p>
					</div>

					<div className={styles.coverVault} aria-hidden="true">
						<div className={styles.paperMoon}>
							<span />
							<span />
							<span />
						</div>
						<div className={styles.miniShelf}>
							<span />
							<span />
							<span />
							<span />
						</div>
					</div>
				</aside>

				<div className={styles.pageStage}>
					<div className={styles.pageDepth} aria-hidden="true" />
					{hasTurned && (
						<div
							key={mode}
							className={`${styles.turnLeaf} ${isRegisterMode ? styles.turnForward : styles.turnBackward}`}
							aria-hidden="true"
						/>
					)}

					<div className={styles.turnPage}>
						<form className={`${styles.pageFace} ${styles.loginFace}`} onSubmit={loginSubmitHandler} aria-hidden={isRegisterMode}>
							<div className={styles.pageHeader}>
								<span>Chapter return</span>
								<h2>Login</h2>
								<p>Enter with your username and password.</p>
							</div>

							<div className={styles.loginSeal} aria-hidden="true">
								<span>Reader pass</span>
								<strong>Private stack</strong>
							</div>

							<label className={styles.field}>
								<span>Username</span>
								<div className={styles.control}>
									<IoPersonOutline />
									<input
										type="text"
										name="username"
										value={loginData.username}
										onChange={loginChangeHandler}
										autoComplete="username"
										required
										disabled={isRegisterMode || isLoginSubmitting}
									/>
								</div>
							</label>

							<label className={styles.field}>
								<span>Password</span>
								<div className={styles.control}>
									<IoLockClosedOutline />
									<input
										type={showPassword ? 'text' : 'password'}
										name="password"
										value={loginData.password}
										onChange={loginChangeHandler}
										autoComplete="current-password"
										required
										minLength={8}
										disabled={isRegisterMode || isLoginSubmitting}
									/>
									<button
										type="button"
										className={styles.eyeButton}
										onClick={() => setShowPassword((currentShowPassword) => !currentShowPassword)}
										aria-label={showPassword ? 'Hide password' : 'Show password'}
										disabled={isRegisterMode || isLoginSubmitting}
									>
										{showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
									</button>
								</div>
							</label>

							<p className={`${styles.feedback} ${loginError ? styles.error : ''}`} aria-live="polite">
								{loginError}
								{loginSubmitted && 'Shelf unlocked.'}
							</p>

							<button className={styles.submitButton} type="submit" disabled={isRegisterMode || isLoginSubmitting}>
								<IoEnterOutline />
								{isLoginSubmitting ? 'Opening shelf...' : 'Sign in'}
							</button>

							<div className={styles.switchLine}>
								<span>Need a library card?</span>
								<button type="button" onClick={() => switchMode('register')} disabled={isRegisterMode || isLoginSubmitting}>
									Turn to register
								</button>
							</div>
						</form>

						<form className={`${styles.pageFace} ${styles.registerFace}`} onSubmit={registerSubmitHandler} aria-hidden={!isRegisterMode}>
							<div className={styles.pageHeader}>
								<span>Chapter one</span>
								<h2>Register</h2>
								<p>Create a shelf that keeps your next reads close.</p>
							</div>

							<div className={styles.registerGrid}>
								{registerFields.map(({ name, label, type, autoComplete, icon: Icon }) => (
									<label key={name} className={styles.field}>
										<span>{label}</span>
										<div className={styles.control}>
											<Icon />
											<input
												type={type}
												name={name}
												value={registerData[name]}
												onChange={registerChangeHandler}
												autoComplete={autoComplete}
												required
												minLength={type === 'password' ? 8 : undefined}
												disabled={!isRegisterMode || isRegisterSubmitting}
											/>
										</div>
									</label>
								))}
							</div>

							<p className={`${styles.feedback} ${showRegisterError ? styles.error : ''}`} aria-live="polite">
								{registerError}
								{registerSubmitted && !passwordsMatch && 'Passwords do not match.'}
								{showRegisterSuccess && 'Your library card is ready.'}
							</p>

							<button className={styles.submitButton} type="submit" disabled={!isRegisterMode || isRegisterSubmitting}>
								<IoBookOutline />
								{isRegisterSubmitting ? 'Writing your card...' : 'Create account'}
							</button>

							<div className={styles.switchLine}>
								<span>Already have a shelf?</span>
								<button type="button" onClick={() => switchMode('login')} disabled={!isRegisterMode || isRegisterSubmitting}>
									Turn to login
								</button>
							</div>
						</form>
					</div>

					<div className={styles.pageMarker}>
						<IoSparklesOutline />
						<span>{isRegisterMode ? 'Register page' : 'Login page'}</span>
					</div>
				</div>
			</section>
		</main>
	)
}

export default AuthBook;
