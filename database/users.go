package database

import (
	"database/sql"
	"net/mail"
)

func UsersDatabaseAdded(email string, password_hashs string, userid string, username string) (int64, error) {
	result, err := DB.Exec("INSERT INTO users (email, password_hashs, user_id, username) VALUES (?, ?, ?, ?)", email, password_hashs, userid, username)
	if err != nil {
		return 0, err // 挿入時にエラーがあれば終了
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return id, nil
}

func UsersDatabaseRead(emailOrId string) (string, error) {
	var passwordHash string

	err := DB.QueryRow(
		"SELECT password_hashs FROM users WHERE email=? OR user_id=?",
		emailOrId,
		emailOrId,
	).Scan(&passwordHash)

	if err != nil {
		return "", err
	}
	return passwordHash, nil
}

func UsersDatabaseIdRead(emailOrId string) (int64, error) {
	_, err := mail.ParseAddress(emailOrId)
	var rows *sql.Rows
	if err != nil {
		rows, err = DB.Query("SELECT id FROM users WHERE user_id=?;", emailOrId)
		if err != nil {
			return 0, err
		}
	} else {
		rows, err = DB.Query("SELECT id FROM users WHERE email=?;", emailOrId)
		if err != nil {
			return 0, err
		}
	}
	defer rows.Close()
	var id int64
	for rows.Next() {
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}
	return id, nil
}
