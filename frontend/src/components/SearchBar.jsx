function SearchBar({ query, onQueryChange, onSearch }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="search-input" className="sr-only">
        Describe the vehicle you want
      </label>

      <textarea
        id="search-input"
        rows={3}
        maxLength={500}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="e.g. Automatic SUVs under 15 lakh in Bangalore"
        className="w-full resize-none rounded-2xl border border-white/15 bg-white/10 p-4 text-base text-white outline-none placeholder:text-white/45 focus:border-mint"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-white/45">
          Natural language, plain and simple
        </span>

        <button
          className="rounded-full bg-mint px-6 py-3 text-sm font-bold text-pine transition hover:bg-white"
          type="submit"
        >
          Search vehicles <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
