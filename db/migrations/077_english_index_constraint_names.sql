-- Normalize index, constraint and sequence names to PostgreSQL's default
-- naming convention, derived from the (already English) table/column names:
--   primary key  <table>_pkey
--   unique       <table>_<cols>_key
--   foreign key  <table>_<cols>_fkey
--   check        <table>_<cols>_check
--   exclusion    <table>_<cols>_excl
--   index        idx_<table>_<cols>   (uq_<table>_<cols> when unique)
--   sequence     <table>_<col>_seq
-- Names are computed from the catalog at run time, so the result is the same
-- on fresh and long-lived databases. Collisions get a numeric suffix; names
-- over 63 bytes are shortened with an md5 suffix.

DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  CREATE TEMP TABLE _ren (
    ord int,
    kind text,
    tbl text,
    old_name text,
    base_name text,
    new_name text
  ) ON COMMIT DROP;

  INSERT INTO _ren (ord, kind, tbl, old_name, base_name)
  SELECT
    CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'x' THEN 3 WHEN 'f' THEN 4 ELSE 5 END,
    'constraint',
    t.relname,
    con.conname,
    CASE con.contype
      WHEN 'p' THEN t.relname || '_pkey'
      WHEN 'u' THEN t.relname || coalesce('_' || cols.c, '') || '_key'
      WHEN 'x' THEN t.relname || coalesce('_' || cols.c, '') || '_excl'
      WHEN 'f' THEN t.relname || coalesce('_' || cols.c, '') || '_fkey'
      ELSE t.relname || coalesce('_' || cols.c, '') || '_check'
    END
  FROM pg_constraint con
  JOIN pg_class t ON t.oid = con.conrelid
  JOIN pg_namespace s ON s.oid = t.relnamespace
  LEFT JOIN LATERAL (
    SELECT string_agg(a.attname, '_' ORDER BY k.ord) AS c
    FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
  ) cols ON true
  WHERE s.nspname = 'public'
    AND con.contype IN ('p', 'u', 'x', 'f', 'c');

  INSERT INTO _ren (ord, kind, tbl, old_name, base_name)
  SELECT
    6,
    'index',
    t.relname,
    ic.relname,
    CASE WHEN i.indisunique THEN 'uq_' ELSE 'idx_' END || t.relname
      || coalesce('_' || cols.c, '')
      || CASE WHEN i.indexprs IS NOT NULL THEN '_expr' ELSE '' END
      || CASE WHEN i.indpred IS NOT NULL THEN '_partial' ELSE '' END
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class t ON t.oid = i.indrelid
  JOIN pg_namespace s ON s.oid = t.relnamespace
  LEFT JOIN LATERAL (
    SELECT string_agg(a.attname, '_' ORDER BY k.ord) AS c
    FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
    WHERE k.attnum > 0
  ) cols ON true
  WHERE s.nspname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid AND c.contype IN ('p', 'u', 'x'));

  INSERT INTO _ren (ord, kind, tbl, old_name, base_name)
  SELECT 7, 'sequence', t.relname, sq.relname, t.relname || '_' || a.attname || '_seq'
  FROM pg_class sq
  JOIN pg_namespace s ON s.oid = sq.relnamespace
  JOIN pg_depend d ON d.objid = sq.oid AND d.classid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
  JOIN pg_class t ON t.oid = d.refobjid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
  WHERE s.nspname = 'public' AND sq.relkind = 'S';

  -- Relation names (tables, views, sequences, indexes) share one namespace;
  -- constraint names are kept globally unique too so they stay greppable.
  CREATE TEMP TABLE _taken (name text PRIMARY KEY) ON COMMIT DROP;
  INSERT INTO _taken
  SELECT c.relname FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
  WHERE s.nspname = 'public'
    AND (c.relkind NOT IN ('i', 'I', 'S')
      OR (c.relkind = 'S' AND NOT EXISTS (SELECT 1 FROM _ren WHERE kind = 'sequence' AND old_name = c.relname)))
  ON CONFLICT DO NOTHING;

  FOR r IN SELECT * FROM _ren ORDER BY ord, tbl, base_name, (old_name = base_name) DESC, old_name LOOP
    base := r.base_name;
    IF octet_length(base) > 63 THEN
      base := left(base, 54) || '_' || left(md5(r.base_name), 8);
    END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM _taken WHERE name = candidate) LOOP
      n := n + 1;
      candidate := CASE WHEN octet_length(base) > 60 THEN left(base, 60) ELSE base END || '_' || n;
    END LOOP;
    INSERT INTO _taken VALUES (candidate);
    UPDATE _ren SET new_name = candidate WHERE kind = r.kind AND tbl = r.tbl AND old_name = r.old_name;
  END LOOP;

  -- Two passes so swaps between existing names never collide.
  FOR r IN SELECT * FROM _ren WHERE old_name <> new_name LOOP
    IF r.kind = 'constraint' THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.tbl, r.old_name, '__ren_' || md5(r.tbl || '.' || r.old_name));
    ELSIF r.kind = 'index' THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', r.old_name, '__ren_' || md5(r.tbl || '.' || r.old_name));
    ELSE
      EXECUTE format('ALTER SEQUENCE %I RENAME TO %I', r.old_name, '__ren_' || md5(r.tbl || '.' || r.old_name));
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM _ren WHERE old_name <> new_name LOOP
    IF r.kind = 'constraint' THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.tbl, '__ren_' || md5(r.tbl || '.' || r.old_name), r.new_name);
    ELSIF r.kind = 'index' THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', '__ren_' || md5(r.tbl || '.' || r.old_name), r.new_name);
    ELSE
      EXECUTE format('ALTER SEQUENCE %I RENAME TO %I', '__ren_' || md5(r.tbl || '.' || r.old_name), r.new_name);
    END IF;
  END LOOP;
END $$;
