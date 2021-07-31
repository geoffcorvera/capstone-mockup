import { createSlice, createAsyncThunk, PayloadAction, CaseReducer } from '@reduxjs/toolkit'
import { RootState } from '../../app/store'
import { CartItem, Play, Ticket, ticketingState } from './ticketingTypes'
import { dayMonthDate, militaryToCivilian } from '../../utils'

const fetchData = async (url: string) => {
    try {
        const res = await fetch(url)
        return await res.json()
    }
    catch(err) {
        console.error(err.message)
    }
}

export const fetchTicketingData = createAsyncThunk(
    'events/fetch',
    async () => {
        const plays: Play[] = await fetchData('/api/plays')
        const tickets: Ticket[] = await fetchData('/api/tickets')
        return {plays, tickets}
    }
)


const applyConcession = (c_price: number, item: CartItem) => {
    const name = item.name + ' + Concessions'
    const price = c_price + item.price
    const desc = `${item.desc} with concessions ticket`
    return ({...item, name, price, desc})
}

const appendCartField = <T extends CartItem>(key: keyof T, val: T[typeof key]) => (obj: any) => ({...obj, [key]: val})

export const toPartialCartItem = (t: Ticket) => ({
    product_id: t.eventid,
    price: t.ticket_price,
    desc: `${t.admission_type} - ${dayMonthDate(t.eventdate)}, ${militaryToCivilian(t.starttime)}`,
})

export const createCartItem = (data: {ticket: Ticket, play: Play, qty: number}): CartItem =>
    [data.ticket].map(toPartialCartItem)
        .map(appendCartField('name', `${data.play.title} Ticket${(data.qty>1) ? 's' : ''}`))
        .map(appendCartField('qty', data.qty))
        .map(appendCartField('product_img_url', data.play.image_url))[0]

type PlayId = string
const isTicket = (obj: any): obj is Ticket => Object.keys(obj).some(key => key==='eventid')
const byId = (id: number|PlayId) => (obj: Ticket|Play) => (isTicket(obj)) ? obj.eventid===id: obj.id===id

const addTicketReducer: CaseReducer<ticketingState, PayloadAction<{ id: number, qty: number, concessions: boolean }>> = (state, action) => {
    const {id, qty, concessions} = action.payload
    const ticket = state.tickets.find(byId(id))
    const play = ticket ? state.plays.find(byId(ticket.playid)) : null
    const cartItem = (ticket && play)
        ? createCartItem({ticket, play, qty})
        : null
        
    return (ticket && cartItem)
        ? {
            ...state,
            cart: (concessions)
                    ? [...state.cart, applyConcession(ticket.concession_price, cartItem)]
                    : [...state.cart, cartItem]
        }
        : state
    }

const editQtyReducer: CaseReducer<ticketingState, PayloadAction<{id: number, qty: number}>> =
    (state, action) => ({
        ...state,
        cart: state.cart.map(item => (item.product_id===action.payload.id)
            ? {
                ...item,
                qty: (action.payload.qty > 0)
                    ? action.payload.qty
                    : 0
            }
            : item
        )
    })

export const INITIAL_STATE: ticketingState = {
    cart: [],
    tickets: [],
    plays: [],
    status: 'idle',
}

const ticketingSlice = createSlice({
    name: 'cart',
    initialState: INITIAL_STATE,
    reducers: {
        addTicketToCart: addTicketReducer,
        editItemQty: editQtyReducer,
        removeTicketFromCart: (state, action: PayloadAction<number>) => ({
            ...state,
            cart: state.cart.filter(item => item.product_id!==action.payload)
        }),
    },
    extraReducers: builder => {
        builder
            .addCase(fetchTicketingData.pending, state => {
                state.status = 'loading'
            })
            .addCase(fetchTicketingData.fulfilled, (state, action) => {
                state.status = 'success'
                state.tickets = (action.payload.tickets)
                    ? action.payload.tickets
                    : []
                state.plays = (action.payload.plays)
                    ? action.payload.plays
                    : []
            })
            .addCase(fetchTicketingData.rejected, state => {
                state.status = 'failed'
            })
    }
})

export const selectCartContents = (state: RootState): CartItem[] => state.ticketing.cart

const parseTicketDate = (t: Ticket) => ({...t, date: [...t.eventdate.split('T'), t.starttime]})
const convertDate = (obj: Ticket & {date: string[]}) => {
    const {eventdate, starttime, ...rest} = obj
    return {...rest, date: new Date(obj.date.join('T'))}
}
/* Returns play data with shape: {
    title, description, image_url,
    tickets: [{
        eventid,
        playid,
        admission_type,
        date: Date
        ticket_price: number,
        concession_price: number,
        available: number,
    }]
} */
export const selectPlayData = (state: RootState, playId: PlayId) => {
    const play = state.ticketing.plays.find(byId(playId))
    if (play) {
        const {id, ...playData} = play
        const tickets = state.ticketing.tickets
            .filter(t => t.playid===playId)
            .map(parseTicketDate)
            .map(convertDate)
            
        return {...playData, tickets}
    }
    else {
        return undefined
    }
}

export const { addTicketToCart, editItemQty, removeTicketFromCart } = ticketingSlice.actions
export default ticketingSlice.reducer