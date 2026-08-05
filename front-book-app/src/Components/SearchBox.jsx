import { IoSearchSharp } from "react-icons/io5"

import styles from './SearchBox.module.css'

function SearchBox({ search, setSearch, searchHandler }) {
	const submitHandler = (event) => {
		event.preventDefault();
		searchHandler();
	}

	return (
		<form className={styles.search} onSubmit={submitHandler}>
			<input type="text" placeholder="search" value={search} onChange={(event) => setSearch(event.target.value.toLowerCase())} />
			<button type="submit" aria-label="Search"><IoSearchSharp /></button>
		</form>
	)
}

export default SearchBox
