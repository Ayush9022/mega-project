import { useContext, useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { initSocket } from "../socket"
import ACTIONS from "../actions/Actions"
import { toast } from "react-hot-toast"
import { Context } from "../context/ContextProvider"

function useSocket() {
	const location = useLocation()
	const navigate = useNavigate()
	const { roomId } = useParams()

	const { socket, setSocket, setClients, code, setCode } = useContext(Context)
	const [isLoading, setIsLoading] = useState(true)
	const [isError, setIsError] = useState(false)

	useEffect(() => {
		if (!location.state?.username) {
			navigate("/")
		}
	}, [navigate, location.state?.username])

	useEffect(() => {
		setIsLoading(true)
		setIsError(false)
		const handleErrs = (err) => {
			console.log("socket error", err)
			console.log("socket connection failed, try again later")
			setIsError(true)
		}

		function init() {
			if (socket == null) {
				const s = initSocket()
				setSocket(s)
			}

			if (socket == null) return

			socket.on("connect", () => setIsLoading(false))
			socket.on("connect_error", handleErrs)
			socket.on("connect_failed", handleErrs)

			socket.emit(ACTIONS.JOIN, {
				roomId,
				username: location.state?.username,
			})

			socket.on(ACTIONS.UPDATE_CLIENTS_LIST, ({ clients }) => {
				setClients(clients)
			})

			socket.on(ACTIONS.DISCONNECTED, ({ username, socketId }) => {
				toast.success(`${username} left the room`)
				setClients((prev) => {
					return prev.filter((client) => client.socketId != socketId)
				})
			})
		}

		init()

		return () => {
			if (socket == null) return

			socket.disconnect()
			socket.off("connect")
			socket.off("connect_error")
			socket.off("connect_failed")
			socket.off(ACTIONS.DISCONNECTED)
			socket.off(ACTIONS.UPDATE_CLIENTS_LIST)
		}
	}, [
		location?.state?.username,
		socket,
		setSocket,
		navigate,
		roomId,
		setClients,
	])

	useEffect(() => {
		if (socket == null) return

		socket.on(ACTIONS.JOINED, ({ username, socketId }) => {
			toast.success(`${username} joined the room`)
			// send the code to the server
			socket.emit(ACTIONS.SYNC_CODE, {
				code,
				socketId,
			})
		})

		//
		socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
			if (code !== null) {
				setCode(code)
			}
		})

		// Listening for sync code event once
		socket.once(ACTIONS.SYNC_CODE, ({ code }) => {
			if (code !== null) {
				// update the code in the editor
				setCode(code)
			}
		})

		return () => {
			socket.off(ACTIONS.JOINED)
			socket.off(ACTIONS.CODE_CHANGE)
			socket.off(ACTIONS.SYNC_CODE)
		}
	}, [socket, code, setCode])

	return { isLoading, isError }
}

export default useSocket
