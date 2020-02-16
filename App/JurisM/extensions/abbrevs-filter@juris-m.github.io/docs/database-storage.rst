^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Database storage and runtime caching
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Source files are loaded to the Filter before use. When loaded, the
jurisdiction, category key, text key and value of each item is
recorded in a set of (normalized) SQLite database tables, and
associated with a particular citation style.

The Filter provides a primitive method ``getAbbreviation()`` that returns
matching values from the database. In ``citeproc-js``, this is wrapped
in a ``loadAbbreviation()`` method that first hits a cache object at
``citeproc.transform.abbrevs`` before resorting to a database call.

