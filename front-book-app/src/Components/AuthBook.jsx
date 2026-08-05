import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
	IoArrowForwardOutline,
	IoBookOutline,
	IoCheckmarkCircle,
	IoEyeOffOutline,
	IoEyeOutline,
	IoLibraryOutline,
	IoLockClosedOutline,
	IoMailOutline,
	IoPersonOutline,
	IoSparklesOutline,
} from 'react-icons/io5';

import styles from './AuthBook.module.css';

const emptyLogin = { username: '', password: '' };
const emptyRegister = {
	username: '',
	email: '',
	firstname: '',
	lastname: '',
	password: '',
	confirmPassword: '',
};

const registerFields = [
	{ name: 'firstname', label: 'First name', autoComplete: 'given-name', icon: IoPersonOutline },
	{ name: 'lastname', label: 'Last name', autoComplete: 'family-name', icon: IoPersonOutline },
	{ name: 'username', label: 'Username', autoComplete: 'username', icon: IoPersonOutline },
	{ name: 'email', label: 'Email address', autoComplete: 'email', icon: IoMailOutline, type: 'email' },
];

const getPasswordStrength = (password) => {
	if (!password) return { level: 0, label: 'Use 8 or more characters' };
	let score = password.length >= 8 ? 1 : 0;
	if (password.length >= 12) score += 1;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
	if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;
	if (score <= 1) return { level: 1, label: 'Password is weak' };
	if (score <= 2) return { level: 2, label: 'Password is good' };
	return { level: 3, label: 'Password is strong' };
};

function PasswordField({ disabled, label, name, onChange, show, toggleShow, value, autoComplete }) {
	return (
		<label className={styles.field}>
			<span>{label}</span>
			<div className={styles.control}>
				<IoLockClosedOutline />
				<input
					type={show ? 'text' : 'password'}
					name={name}
					value={value}
					onChange={onChange}
					autoComplete={autoComplete}
					placeholder="At least 8 characters"
					required
					minLength={8}
					disabled={disabled}
				/>
				<button type="button" className={styles.eye} onClick={toggleShow} disabled={disabled} aria-label={show ? 'Hide password' : 'Show password'}>
					{show ? <IoEyeOffOutline /> : <IoEyeOutline />}
				</button>
			</div>
		</label>
	);
}

PasswordField.propTypes = {
	autoComplete: PropTypes.string.isRequired,
	disabled: PropTypes.bool.isRequired,
	label: PropTypes.string.isRequired,
	name: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	show: PropTypes.bool.isRequired,
	toggleShow: PropTypes.func.isRequired,
	value: PropTypes.string.isRequired,
};

function AuthBook({ authMode = 'login', onLogin, onNavigate, onRegister }) {
	const [mode, setMode] = useState(authMode);
	const [loginData, setLoginData] = useState(emptyLogin);
	const [registerData, setRegisterData] = useState(emptyRegister);
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const isRegister = mode === 'register';
	const passwordStrength = getPasswordStrength(registerData.password);
	const hasConfirmation = Boolean(registerData.confirmPassword);
	const passwordsMatch = hasConfirmation && registerData.password === registerData.confirmPassword;

	useEffect(() => setMode(authMode), [authMode]);

	const changeMode = (nextMode) => {
		if (submitting || nextMode === mode) return;
		setMode(nextMode);
		setError('');
		onNavigate?.(`/${nextMode}`);
	};

	const changeLogin = ({ target: { name, value } }) => {
		setLoginData((current) => ({ ...current, [name]: value }));
	};

	const changeRegister = ({ target: { name, value } }) => {
		setRegisterData((current) => ({ ...current, [name]: value }));
	};

	const submitLogin = async (event) => {
		event.preventDefault();
		setSubmitting(true);
		setError('');
		try {
			await onLogin({ username: loginData.username.trim(), password: loginData.password });
		} catch (requestError) {
			setError(requestError.message || 'We could not sign you in. Please check your details.');
		} finally {
			setSubmitting(false);
		}
	};

	const submitRegister = async (event) => {
		event.preventDefault();
		setError('');
		if (!passwordsMatch) {
			setError('The passwords do not match.');
			return;
		}
		setSubmitting(true);
		try {
			await onRegister({
				username: registerData.username.trim(),
				email: registerData.email.trim(),
				first_name: registerData.firstname.trim(),
				last_name: registerData.lastname.trim(),
				password: registerData.password,
				password_confirm: registerData.confirmPassword,
			});
		} catch (requestError) {
			setError(requestError.message || 'We could not create your account.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className={styles.authShell}>
			<section className={styles.authCard}>
				<aside className={styles.storyPanel}>
					<div className={styles.floatingPages} aria-hidden="true"><i /><i /><i /></div>
					<div className={styles.brandMark}><IoLibraryOutline /><span>THE READING ROOM</span></div>
					<div className={styles.storyCopy}>
						<span className={styles.kicker}><IoSparklesOutline /> A place for curious minds</span>
						<h1>Your next great<br /><em>story</em> starts here.</h1>
						<p>Build a personal shelf, save the books you love, and always know what to read next.</p>
						<div className={styles.benefits}>
							<span><IoCheckmarkCircle /> Curated titles</span>
							<span><IoCheckmarkCircle /> Your private wishlist</span>
						</div>
					</div>
					<div className={styles.bookScene} aria-hidden="true">
						<div className={styles.sun} />
						<div className={styles.openBook}><i /><i /><span /></div>
						<div className={styles.bookOne}><span>ESSAYS</span></div>
						<div className={styles.bookTwo}><span>STORIES</span></div>
						<div className={styles.bookThree}><IoBookOutline /></div>
						<div className={styles.shelf} />
					</div>
					<small className={styles.quote}>“A reader lives a thousand lives.”</small>
				</aside>

				<div className={styles.formPanel}>
					<div className={styles.mobileBrand}><IoLibraryOutline /> The Reading Room</div>
					<div className={styles.tabs} role="tablist" aria-label="Account access">
						<button className={!isRegister ? styles.activeTab : ''} type="button" onClick={() => changeMode('login')}>Sign in</button>
						<button className={isRegister ? styles.activeTab : ''} type="button" onClick={() => changeMode('register')}>Create account</button>
					</div>

					<div className={styles.formHeading}>
						<span>{isRegister ? 'JOIN THE BOOK CLUB' : 'WELCOME BACK'}</span>
						<h2>{isRegister ? 'Create your reader profile' : 'Return to your bookshelf'}</h2>
						<p>{isRegister ? 'It only takes a minute to begin your collection.' : 'Sign in to continue your reading journey.'}</p>
					</div>

					{isRegister ? (
						<form className={styles.form} onSubmit={submitRegister}>
							<div className={styles.fieldGrid}>
								{registerFields.map(({ name, label, type = 'text', autoComplete, icon: Icon }) => (
									<label className={styles.field} key={name}>
										<span>{label}</span>
										<div className={styles.control}><Icon /><input type={type} name={name} value={registerData[name]} onChange={changeRegister} autoComplete={autoComplete} placeholder={label} required disabled={submitting} autoFocus={name === 'firstname'} /></div>
									</label>
								))}
							</div>
							<PasswordField label="Password" name="password" value={registerData.password} onChange={changeRegister} show={showPassword} toggleShow={() => setShowPassword((value) => !value)} autoComplete="new-password" disabled={submitting} />
							<div className={styles.passwordGuide} aria-live="polite">
								<div className={styles.strengthBars} data-level={passwordStrength.level}><i /><i /><i /></div>
								<span>{passwordStrength.label}</span>
							</div>
							<PasswordField label="Confirm password" name="confirmPassword" value={registerData.confirmPassword} onChange={changeRegister} show={showPassword} toggleShow={() => setShowPassword((value) => !value)} autoComplete="new-password" disabled={submitting} />
							{hasConfirmation && <p className={`${styles.matchStatus} ${passwordsMatch ? styles.matches : styles.noMatch}`}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match yet'}</p>}
							{error && <p className={styles.error} role="alert">{error}</p>}
							<button className={styles.submit} type="submit" disabled={submitting}>{submitting ? 'Creating your shelf…' : 'Start my collection'} {!submitting && <IoArrowForwardOutline />}</button>
						</form>
					) : (
						<form className={styles.form} onSubmit={submitLogin}>
							<label className={styles.field}>
								<span>Username</span>
								<div className={styles.control}><IoPersonOutline /><input name="username" value={loginData.username} onChange={changeLogin} autoComplete="username" placeholder="Your username" required disabled={submitting} autoFocus /></div>
							</label>
							<PasswordField label="Password" name="password" value={loginData.password} onChange={changeLogin} show={showPassword} toggleShow={() => setShowPassword((value) => !value)} autoComplete="current-password" disabled={submitting} />
							<div className={styles.formNote}><span>Keep your bookshelf close.</span><span>Secure access</span></div>
							{error && <p className={styles.error} role="alert">{error}</p>}
							<button className={styles.submit} type="submit" disabled={submitting}>{submitting ? 'Opening your shelf…' : 'Enter the reading room'} {!submitting && <IoArrowForwardOutline />}</button>
						</form>
					)}

					<p className={styles.switchPrompt}>{isRegister ? 'Already collecting with us?' : 'New to The Reading Room?'} <button type="button" onClick={() => changeMode(isRegister ? 'login' : 'register')}>{isRegister ? 'Sign in' : 'Create an account'}</button></p>
				</div>
			</section>
		</main>
	);
}

AuthBook.propTypes = {
	authMode: PropTypes.oneOf(['login', 'register']),
	onLogin: PropTypes.func.isRequired,
	onNavigate: PropTypes.func.isRequired,
	onRegister: PropTypes.func.isRequired,
};

export default AuthBook;
