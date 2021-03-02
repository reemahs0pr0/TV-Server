// load libraries
const morgan = require("morgan");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

// SQL
const SQL_SELECT_GENRES =
  "select distinct genre from genres order by genre asc";
const SQL_SELECT_TVSHOW_BY_GENRE = "select tvid from genres where genre like ?";
const SQL_SELECT_TVSHOW_BY_TVIDS =
  "select tvid, name from tv_shows where tvid in (?) order by name asc";
const SQL_SELECT_TVSHOW_BY_TVID = "select * from tv_shows where tvid = ?";

// set the port
const PORT = parseInt(process.env.PORT) || 3000;

// configure the database
const DB_HOST = process.env.HOST || "localhost";
const DB_PORT = parseInt(process.env.PORT) || 3306;
const DB_USER = process.env.USER || "pebbles";
const DB_PASSWORD = process.env.PASSWORD || "pebbles";
const DB_SCHEMA = process.env.SCHEMA || "leisure";

// create connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  pool: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_SCHEMA,
  connectionLimit: 4,
});

// create application
const app = express();

// configure middleware
app.use(morgan("combines"));
app.use(cors());

// Resources
// GET /genres
app.get("/api/genres", async (req, resp) => {
  // get a connection from the pool
  const conn = await pool.getConnection();
  // perform the query, query() returns an array of 2 elements
  // 0 - array of you data, 1 - metadata of the result
  try {
    const [result, _] = await conn.query(SQL_SELECT_GENRES);
    resp
      .status(200)
      .type("application/json")
      .json(result.map((v) => v["genre"]));
  } catch (e) {
    console.error("ERROR: ", e);
    console.dir(e);
    resp.status(500).type("application/json").json({ error: e });
  } finally {
    conn.release();
  }
});

// GET /api/genre/:genre
app.get("/api/genre/:genre", async (req, resp) => {
  const genre = req.params["genre"];

  const conn = await pool.getConnection();

  try {
    let [result, _] = await conn.query(SQL_SELECT_TVSHOW_BY_GENRE, [genre]);
    // [ {tvid: 1}, {tvid: 5}, ...] => [1, 5, ...]
    let tvids = result.map((v) => v["tvid"]);

    [result, _] = await conn.query(SQL_SELECT_TVSHOW_BY_TVIDS, [tvids]);

    resp.status(200).type("application/json").json(result);
  } catch (e) {
    console.error("ERROR: ", e);
    console.dir(e);
    resp.status(500).type("application/json").json({ error: e });
  } finally {
    conn.release();
  }
});

// GET /api/tvshow/:tvid
app.get("/api/tvshow/:tvid", async (req, resp) => {
  const tvid = parseInt(req.params["tvid"]);

  const conn = await pool.getConnection();

  try {
    const [result, _] = await conn.query(SQL_SELECT_TVSHOW_BY_TVID, [tvid]);
    if (result.length <= 0) {
      resp
        .status(404)
        .type("applicaiotn/json")
        .json({ error: `tvid ${tvid} not found` });
      return;
    }
    resp.status(200).type("application/json").json(result[0]);
  } catch (e) {
    console.error("ERROR: ", e);
    console.dir(e);
    resp.status(500).type("application/json").json({ error: e });
  } finally {
    conn.release();
  }
});

// Start the application
const startApp = async (app, pool) => {
  // check out a connection
  const conn = await pool.getConnection();
  try {
    // ping
    await conn.ping();
    // release the connection back to the pool
    conn.release();
    //since we can ping, start application
    app.listen(PORT, () => {
      console.info(`Application started on port ${PORT} at ${new Date()}`);
    });
  } catch (error) {
    console.info("Error: ".error);
    process.exit(-1);
  }
};
startApp(app, pool);
