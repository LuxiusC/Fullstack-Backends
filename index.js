require("dotenv").config();
let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const { DATABASE_URL } = process.env;
const PORT = process.env.PORT || 3000
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    require: true
  }
});

//Profile Starts
//Get all from users
app.get('/profile/:firebase_uid', async (req, res) => {
  const { firebase_uid } = req.params
  const client = await pool.connect()
  try {
    const getId = await client.query("SELECT id from profile WHERE firebase_uid = $1", [firebase_uid])
    if (getId.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" })
    }
    const result = await client.query('SELECT * from profile WHERE id=$1', [getId.rows[0].id])
    res.json(result.rows[0])
  } catch (error) {
    console.error(error, error.message)
  } finally {
    client.release()
  }
})

app.post('/profile', async (req, res) => {
  const { firebase_uid, name, email, image_url, introduction, occupation } = req.body
  const client = await pool.connect()
  try {
    const result = await client.query("INSERT INTO profile (firebase_uid,name,email,image_url,introduction,occupation) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [firebase_uid, name, email, image_url, introduction, occupation])
    res.json(result.rows)
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})

app.put('/profile/update/:firebase_uid', async (req, res) => {
  const { firebase_uid } = req.params
  const { name, image_url } = req.body
  const client = await pool.connect()
  try {
    const searchQuery = await client.query("SELECT * from profile where firebase_uid = $1", [firebase_uid])
    if (searchQuery.rows.length === 0) {
      return res.status(404).json({ "message": "User not found" })
    }
    const id = searchQuery.rows[0].id
    const result = await client.query("UPDATE profile SET name=$1,image_url=$2 WHERE id=$3 RETURNING *", [name, image_url, id])
    res.json({ "Message": "Update succesfully" })
  } catch (error) {
    console.error(error, error.message)
  } finally {
    client.release()
  }
})
// Profile End
//Favourite_recipe Start
app.get('/recipes/:firebase_uid', async (req, res) => {
  const { firebase_uid } = req.params
  const client = await pool.connect()
  try {
    const getId = await client.query("SELECT id from profile WHERE firebase_uid = $1", [firebase_uid])
    if (getId.rows.length === 0) {
      return res.status(404).json({ "Message": "User not found" })
    }
    const id = getId.rows[0].id
    const result = await client.query("SELECT * from favourite_recipe WHERE profile_id = $1", [id])
    res.json(result.rows)
  } catch (err) {
    console.error(err, err.Message)
  } finally {
    client.release()
  }
})

app.post('/recipes/post/:firebase_uid', async (req, res) => {
  const { recipe_id, recipe_name, recipe_country, youtube_url, image_url, profile_id } = req.body
  const { firebase_uid } = req.params
  const client = await pool.connect()
  try {
    const getId = await client.query("SELECT id from profile WHERE firebase_uid = $1", [firebase_uid])
    if (getId.rows.length === 0) {
      return res.status(404).json({ "Message": "User not found" })
    }
    const id = getId.rows[0].id
    const result = await client.query("INSERT INTO favourite_recipe (recipe_id,recipe_name,recipe_country,youtube_url,image_url,profile_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [recipe_id, recipe_name, recipe_country, youtube_url, image_url, id])
    res.json(result.rows)
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})
//Favourite_recipe end
// user_recipe Start
app.get('/userRecipe', async (req, res) => {
  const client = await pool.connect()
  try {
    const result = await client.query("SELECT profile.name,profile.firebase_uid,user_recipe.* from profile INNER JOIN user_recipe ON profile.id = user_recipe.profile_id")
    res.json(result.rows)
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})

app.post('/userRecipe/post/:firebase_uid', async (req, res) => {
  const { recipe_id, title, price, image_url, recipe_country } = req.body
  const { firebase_uid } = req.params
  const client = await pool.connect()
  try {

    const getId = await client.query("SELECT id from profile WHERE firebase_uid = $1", [firebase_uid])
    if (getId.rows.length === 0) {
      return res.status(404).json({ "Message": "User not found" })
    }
    const id = getId.rows[0].id

    const getRecipe = await client.query("SELECT * from favourite_recipe WHERE recipe_id=$1", [recipe_id])
    if (getRecipe.rows.length === 0) {
      return res.status(404).json({ "Message": "Recipe not found" })
    }

    const result = await client.query("INSERT INTO user_recipe (profile_id,recipe_id,title,price,image_url,recipe_country) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [id, recipe_id, title, price, image_url, recipe_country])
    res.json(result.rows)
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})

app.put('/userRecipe/update/:id', async (req, res) => {
  const client = await pool.connect()
  const { id } = req.params
  const { title, price, image_url } = req.body
  try {
    const postExist = await client.query("SELECT * from user_recipe WHERE id=$1", [id])
    if (postExist.rows.length === 0) {
      return res.status(404).json({ "message": "post not found" })
    }
    const result = await client.query("UPDATE user_recipe SET title=$1,price=$2,image_url=$3 WHERE id=$4 RETURNING *", [title, price, image_url, id])
    res.json(result.rows)
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})

app.delete('/delete/:id', async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    const result = await client.query("DELETE FROM user_recipe WHERE id=$1", [id])
    res.json({ "message": "Delete succesfully" })
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})

app.post('/purchase/:id', async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    const postExist = await client.query('SELECT * from user_recipe WHERE id=$1', [id])
    if (postExist.rows.length === 0) {
      return res.status(404).json({ "Message": "Post not found" })
    }
    const updatePost = await client.query("UPDATE user_recipe SET purchase_state = TRUE WHERE id=$1", [id])
    res.json({ "message": "Sold" })
  } catch (err) {
    console.error(err, err.message)
  } finally {
    client.release()
  }
})
// user_recipe end

module.exports = app 