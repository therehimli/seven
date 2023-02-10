import { FC, useEffect, useState } from 'react'
import {
  AvatarGroup,
  Box,
  Collapse,
  Divider,
  IconButton,
  Modal,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  collection,
  orderBy,
  query,
  doc,
  onSnapshot,
  DocumentData,
  runTransaction,
  where,
} from 'firebase/firestore'
import { IPost, IUser } from '../../../types'
import { useAuth } from '../../providers/useAuth'
import { BorderBox } from '../../ui/ThemeBox'
import { Link } from 'react-router-dom'
import { ThemeAvatar } from '../../ui/ThemeAvatar'
import {
  Clear,
  Favorite,
  FavoriteBorder,
  TaskAlt,
  Visibility,
} from '@mui/icons-material'
import moment from 'moment'
import PostSettings from '../home/PostSettings'
import { ThemeTooltip } from '../../ui/ThemeTooltip'
import { ThemeLikeIconButton } from '../../ui/ThemeIconButton'
import { TransitionGroup } from 'react-transition-group'

const Bookmarks: FC = () => {
  const [posts, setPosts] = useState<IPost[]>([])

  const [openModal, setOpenModal] = useState(false)
  const [modalData, setModalData] = useState<IUser[]>([])

  const { db, cur, user } = useAuth()

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('bookmarks', 'array-contains', cur.uid)
      // orderBy('createdAt', 'desc')
      // limit(4)
    )

    const setPostsFunc = onSnapshot(q, (querySnapshot) => {
      const postsArr: IPost[] = []
      querySnapshot.forEach(async (d: DocumentData) => {
        postsArr.push(d.data())
      })
      setPosts(postsArr)
    })

    return () => {
      setPostsFunc()
    }
  }, [])

  const handleOpenModal = (post: IPost) => {
    setOpenModal(true)
    setModalData(post.likes)
  }

  const handleCloseModal = () => {
    setOpenModal(false)
    setModalData([])
  }

  const handleLike = async (post: IPost) => {
    const docRef = doc(db, 'posts', post.id)

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef)
        if (!sfDoc.exists()) {
          throw 'Document does not exist!'
        }
        if (!sfDoc.data().likes.includes(cur.uid)) {
          const newLikesArr = [
            ...sfDoc.data().likes,
            {
              displayName: cur.displayName,
              photoURL: cur.photoURL,
              uid: cur.uid,
              emoji: user?.emoji,
            },
          ]
          transaction.update(docRef, {
            likes: newLikesArr,
          })
        }
      })
    } catch (e) {
      console.log('Like failed: ', e)
    }
  }

  const handleDislike = async (post: IPost) => {
    const docRef = doc(db, 'posts', post.id)

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef)
        if (!sfDoc.exists()) {
          throw 'Document does not exist!'
        }
        const newLikesArr = sfDoc
          .data()
          .likes.filter((x: IUser) => x.uid !== cur.uid)
        transaction.update(docRef, {
          likes: newLikesArr,
        })
      })
    } catch (e) {
      console.log('Dislike failed: ', e)
    }
  }

  useEffect(() => {
    const curUserRef = doc(db, 'users', cur.uid)

    try {
      runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(curUserRef)
        if (!sfDoc.exists()) {
          throw 'Document does not exist!'
        }
        transaction.update(curUserRef, {
          bookmarks: [],
        })
      })
    } catch (e) {
      console.log('Delete Bookmark failed: ', e)
    }
  }, [])

  return (
    <>
      <BorderBox sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5" textAlign="center">
          <b>Bookmarks</b>
        </Typography>
      </BorderBox>
      <TransitionGroup>
        {posts
          .sort((a, b) => +b.createdAt - +a.createdAt)
          .map((post) => (
            <Collapse key={post.id}>
              <BorderBox sx={{ p: 3, mb: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack
                    alignItems="center"
                    direction="row"
                    spacing={2}
                    sx={{ mb: 2 }}
                  >
                    <Link to={`/profile/${post.author.uid}`}>
                      <ThemeAvatar
                        alt={post.author.displayName}
                        src={post.author.photoURL}
                        draggable={false}
                      >
                        {post.author.emoji}
                      </ThemeAvatar>
                    </Link>
                    <Stack>
                      <Stack alignItems="center" direction="row" spacing={0.5}>
                        <Link to={`/profile/${post.author.uid}`}>
                          <Typography variant="h6">
                            <b>{post.author.displayName}</b>
                          </Typography>
                        </Link>
                        {post.author.uid === 'Y8kEZYAQAGa7VgaWhRBQZPKRmqw1' && (
                          <Tooltip title="Admin" placement="top">
                            <TaskAlt
                              color="info"
                              sx={{
                                width: '20px ',
                                height: '20px',
                              }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                      <Typography variant="body2" color="textSecondary">
                        {moment(post.createdAt).calendar(null, {
                          lastDay: '[yesterday at] H:mm',
                          sameDay: '[today at] H:mm',
                          nextDay: '[tomorrow at] H:mm',
                          lastWeek: 'D MMM [at] H:mm',
                          nextWeek: 'D MMM [at] H:mm',
                          sameElse: 'D MMM YYYY',
                        })}
                      </Typography>
                    </Stack>
                  </Stack>
                  {/* <PostSettings
              post={post}
              setEditingId={setEditingId}
              setDeletedPosts={setDeletedPosts}
            /> */}
                </Stack>
                <Typography variant="body1" sx={{ ml: 1 }}>
                  {post.content}
                </Typography>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ ml: -1, mb: -1 }}
                >
                  <Stack
                    alignItems="center"
                    direction="row"
                    // spacing={0.2}
                    sx={{ mt: 2 }}
                  >
                    <ThemeTooltip
                      title={
                        post.likes.length > 0 && (
                          <>
                            <Typography
                              textAlign="center"
                              variant="body2"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => handleOpenModal(post)}
                            >
                              Likes
                            </Typography>
                            <AvatarGroup
                              max={4}
                              spacing={12}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => handleOpenModal(post)}
                            >
                              {post.likes.map((user) => (
                                <Link
                                  to={`/profile/${user.uid}`}
                                  key={user.uid}
                                >
                                  <ThemeAvatar
                                    alt={user.displayName}
                                    src={user.photoURL}
                                    title={user.displayName}
                                    sx={{
                                      width: '40px',
                                      height: '40px',
                                    }}
                                  >
                                    {user.emoji}
                                  </ThemeAvatar>
                                </Link>
                              ))}
                            </AvatarGroup>
                          </>
                        )
                      }
                      placement="top"
                    >
                      {cur.uid && !post.likes.some((x) => x.uid === cur.uid) ? (
                        <IconButton
                          onClick={() => handleLike(post)}
                          color="secondary"
                        >
                          <FavoriteBorder />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={() => handleDislike(post)}
                          color="error"
                        >
                          <Favorite />
                        </IconButton>
                      )}
                    </ThemeTooltip>
                    <Typography variant="body1" color="textSecondary">
                      <b>{post.likes.length > 0 && post.likes.length}</b>
                    </Typography>
                  </Stack>
                  <Stack
                    alignItems="center"
                    direction="row"
                    spacing={1}
                    sx={{ mt: 2 }}
                  >
                    <Visibility color="secondary" />
                    <Typography variant="body2" color="textSecondary">
                      {post.views < 1000
                        ? post.views
                        : Math.floor(post.views / 100) / 10 + 'K'}
                    </Typography>
                  </Stack>
                </Stack>
                {post.comments.length > 0 && (
                  <Stack sx={{ position: 'relative', zIndex: 1, mt: 1 }}>
                    <TransitionGroup>
                      {post.comments.map((comment) => (
                        <Collapse key={comment.id}>
                          <Divider sx={{ my: 2 }} />
                          <Stack direction="row" justifyContent="space-between">
                            <Stack direction="row" spacing={2}>
                              <Link to={`/profile/${comment.author.uid}`}>
                                <ThemeAvatar
                                  alt={comment.author.displayName}
                                  src={comment.author.photoURL}
                                  draggable={false}
                                  sx={{ mt: 0.6 }}
                                >
                                  {comment.author.emoji}
                                </ThemeAvatar>
                              </Link>
                              <Stack>
                                <Stack
                                  alignItems="center"
                                  direction="row"
                                  spacing={0.5}
                                >
                                  <Link to={`/profile/${comment.author.uid}`}>
                                    <Typography variant="h6">
                                      <b>{comment.author.displayName}</b>
                                    </Typography>
                                  </Link>
                                  {comment.author.uid ===
                                    'Y8kEZYAQAGa7VgaWhRBQZPKRmqw1' && (
                                    <Tooltip title="Admin" placement="top">
                                      <TaskAlt
                                        color="info"
                                        sx={{
                                          width: '20px ',
                                          height: '20px',
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                </Stack>
                                <Typography variant="body1" sx={{ mb: 1 }}>
                                  {comment.content}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  {moment(comment.createdAt).calendar(null, {
                                    lastDay: '[yesterday at] H:mm',
                                    sameDay: '[today at] H:mm',
                                    nextDay: '[tomorrow at] H:mm',
                                    lastWeek: 'D MMM [at] H:mm',
                                    nextWeek: 'D MMM [at] H:mm',
                                    sameElse: 'D MMM YYYY',
                                  })}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Stack>
                        </Collapse>
                      ))}
                    </TransitionGroup>
                  </Stack>
                )}
              </BorderBox>
            </Collapse>
          ))}
      </TransitionGroup>
      <Modal
        open={openModal}
        onClose={() => {
          setOpenModal(false)
          setModalData([])
        }}
        // BackdropProps={{
        //   style: { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
        // }}
        sx={{
          zIndex: 1600,
        }}
      >
        <BorderBox
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            p: 3,
            transform: 'translate(-50%, -50%)',
            width: 500,
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body1">
              Likes: {modalData.length > 0 && modalData.length}
            </Typography>
            <IconButton
              onClick={handleCloseModal}
              color="secondary"
              sx={{ width: '50px ', height: '50px', m: -2 }}
            >
              <Clear />
            </IconButton>
          </Stack>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mt: 2 }}>
            {modalData.map((user) => (
              <Box key={user.uid} sx={{ width: '100px' }}>
                <Link to={`/profile/${user.uid}`}>
                  <ThemeAvatar
                    alt={user.displayName}
                    src={user.photoURL}
                    sx={{
                      width: '100px',
                      height: '100px',
                      mb: 1,
                    }}
                  >
                    <Typography variant="h3">{user.emoji}</Typography>
                  </ThemeAvatar>
                  <Box
                    sx={{
                      position: 'relative',
                      top: '-33px',
                      left: '74px',
                      height: '30px',
                      width: '30px',
                      mb: '-33px',
                      zIndex: 1,
                    }}
                  >
                    <ThemeLikeIconButton color="error">
                      <Favorite fontSize="small" />
                    </ThemeLikeIconButton>
                  </Box>
                  <Typography variant="body2" textAlign="center">
                    {user.displayName.replace(/ .*/, '')}
                  </Typography>
                </Link>
              </Box>
            ))}
          </Stack>
        </BorderBox>
      </Modal>
    </>
  )
}

export default Bookmarks
