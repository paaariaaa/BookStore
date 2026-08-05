import PropTypes from 'prop-types';

import { resolveMediaUrl } from '../services/api';
import styles from './SideCard.module.css'

function SideCard({ data: { image, title } }) {
	const coverImage = resolveMediaUrl(image);

	return (
		<div className={styles.card}>
			{coverImage ? <img src={coverImage} alt={title} /> : <span className={styles.coverFallback}>{title?.[0] || 'B'}</span>}
			<p>{title}</p>
		</div>
	)
}

SideCard.propTypes = {
	data: PropTypes.shape({
		image: PropTypes.string,
		title: PropTypes.string.isRequired,
	}).isRequired,
};

export default SideCard
