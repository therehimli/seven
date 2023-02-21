import { createContext, FC, useEffect, useMemo, useState } from 'react'
import {
  getAuth,
  onAuthStateChanged,
  Auth,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth'
import {
  getFirestore,
  Firestore,
  onSnapshot,
  DocumentData,
  doc,
  collection,
  query,
} from 'firebase/firestore'
import { IUser } from '../../types'
import { FirebaseStorage, getStorage } from 'firebase/storage'
import {
  getDatabase,
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
  Database,
} from 'firebase/database'
import { useAppDispatch } from '../../hooks/redux'
import { userSlice } from '../../store/reducers/UserSlice'

type Props = {
  children: any
}

interface IContext {
  ga: Auth
  db: Firestore
  st: FirebaseStorage
  gProvider: GoogleAuthProvider
  gitProvider: GithubAuthProvider
  fProvider: FacebookAuthProvider
  users: IUser[]
  rdb: Database
  usersRdb: any
}

export const AuthContext = createContext<IContext>({} as IContext)

export const AuthProvider: FC<Props> = ({ children }) => {
  const [users, setUsers] = useState<IUser[]>([])
  const [usersRdb, setUsersRdb] = useState<any>({})

  const { setUser, removeUser } = userSlice.actions
  const dispatch = useAppDispatch()

  const ga = getAuth()
  const db = getFirestore()
  const st = getStorage()
  const gProvider = new GoogleAuthProvider()
  const gitProvider = new GithubAuthProvider()
  const fProvider = new FacebookAuthProvider()
  const rdb = getDatabase()

  useEffect(() => {
    const unListen = onAuthStateChanged(ga, (userAuth) => {
      if (userAuth) {
        const unsub = onSnapshot(doc(db, 'users', userAuth.uid), (doc) => {
          const userData: DocumentData | undefined = doc.data()
          if (userData) {
            dispatch(
              setUser({
                bookmarks: [...userData.bookmarks],
                createdAt: userData.createdAt,
                displayName: userData.displayName,
                email: userData.email,
                emoji: userData.emoji,
                friends: [...userData.friends],
                groups: [...userData.groups],
                music: [...userData.music],
                password: userData.password,
                photoURL: userData.photoURL,
                images: [...userData.images],
                uid: userData.uid,
              })
            )

            // Realtime Database
            const isOnlineRef = ref(rdb, `users/${userData.uid}/online`)
            const userRef = ref(rdb, `users/${userData.uid}`)
            const lastOnlineRef = ref(rdb, `users/${userData.uid}/lastOnline`)

            const connectedRef = ref(rdb, '.info/connected')

            onValue(connectedRef, (snap) => {
              if (snap.val() === true) {
                set(userRef, {
                  bookmarks: [...userData.bookmarks],
                  createdAt: userData.createdAt,
                  displayName: userData.displayName,
                  email: userData.email,
                  emoji: userData.emoji,
                  friends: [...userData.friends],
                  groups: [...userData.groups],
                  lastOnline: serverTimestamp(),
                  music: [...userData.music],
                  password: userData.password,
                  photoURL: userData.photoURL,
                  images: [...userData.images],
                  uid: userData.uid,
                  online: true,
                })

                onDisconnect(isOnlineRef).set(false)
                onDisconnect(lastOnlineRef).set(serverTimestamp())
              }
            })

            const usersRef = ref(rdb, `users`)
            onValue(usersRef, (snapshot) => {
              const data = snapshot.val()
              setUsersRdb(data)
            })
          }
        })

        const q = query(collection(db, 'users'))

        const setUsersFunc = onSnapshot(q, (querySnapshot) => {
          const usersArr: IUser[] = []
          querySnapshot.forEach(async (d: DocumentData) => {
            usersArr.push(d.data())
          })
          setUsers(usersArr)
        })
      } else {
        dispatch(removeUser())
      }
    })

    return () => {
      unListen()
    }
  }, [])

  const values = useMemo(
    () => ({
      ga,
      db,
      st,
      gProvider,
      gitProvider,
      fProvider,
      users,
      rdb,
      usersRdb,
    }),
    [ga, db, st, gProvider, gitProvider, fProvider, users, rdb, usersRdb]
  )

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}
