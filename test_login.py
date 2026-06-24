import bcrypt, psycopg2

nouveau_mdp = "admin123"  # choisis ce que tu veux
hash_ = bcrypt.hashpw(nouveau_mdp.encode(), bcrypt.gensalt()).decode()

conn = psycopg2.connect(dbname="bdd_siege", user="user", password="password", host="db_siege", port="5432")
cur = conn.cursor()
cur.execute("UPDATE utilisateur SET password = %s WHERE email = %s", (hash_, "admin@futurekawa.com"))
conn.commit()
cur.close()
conn.close()
print("Mot de passe réinitialisé.")