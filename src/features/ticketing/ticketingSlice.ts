import { createSlice, createAsyncThunk, PayloadAction, CaseReducer } from '@reduxjs/toolkit'
import { RootState } from '../../app/store'
import { CartItem, Play, Ticket, ticketingState } from './ticketingTypes'
import { titleCase, dayMonthDate, militaryToCivilian } from '../../utils'

const fetchData = async (url: string) => {
    try {
        const res = await fetch(url)
        return await res.json()
    }
    catch(err) {
        console.error(err.message)
    }
}

const capitalizeTitles = (ticket: Ticket) => ({...ticket, event_title: titleCase(ticket.event_title)})
// TODO: sort by date
export const fetchTicketingData = createAsyncThunk(
    'events/fetch',
    async () => {
        const plays: Play[] = await fetchData('/api/plays')
        const tickets: Ticket[] = await fetchData('/api/tickets')
        return {plays, tickets: tickets.map(capitalizeTitles)}
    }
)


const applyConcession = (c_price: number, item: CartItem) => {
    const name = item.name + ' + Concessions'
    const price = c_price + item.price
    const desc = `${item.desc} with concessions ticket`
    return ({...item, name, price, desc})
}

const toPartialCartItem = (t: Ticket) => ({
    product_id: t.eventid,
    name: t.event_title + ' ticket(s)',
    price: t.ticket_price,
    desc: `${t.admission_type} - ${dayMonthDate(t.eventdate)}, ${militaryToCivilian(t.starttime)}`,
})

const isTicket = (obj: any): obj is Ticket => Object.keys(obj).some(key => key==='eventid')
const byId = (id: number|string) => (obj: Ticket|Play) => (isTicket(obj)) ? obj.eventid===id: obj.id===id

const addTicketReducer: CaseReducer<ticketingState, PayloadAction<{ id: number, qty: number, concessions: boolean }>> = (state, action) => {
    const ticketData = state.tickets.find(byId(action.payload.id))
    const cartItem = (ticketData)
        ? {
            ...toPartialCartItem(ticketData),
            qty: action.payload.qty,
            product_img_url: state.plays.find(byId(ticketData.playid))!.image_url,
        } : ticketData
        
    return (cartItem)
        ? {
            ...state,
            cart: (action.payload.concessions)
                    ? [...state.cart, applyConcession(ticketData!.concession_price, cartItem)]
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

const INITIAL_STATE: ticketingState = {
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
export const { addTicketToCart, editItemQty, removeTicketFromCart } = ticketingSlice.actions
export default ticketingSlice.reducer