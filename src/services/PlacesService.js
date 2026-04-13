import { insforge } from '../lib/insforge.js'

export class PlacesService {
    // ── Places ────────────────────────────────────────────────────────────────

    static async getPlaces() {
        const { data, error } = await insforge.database
            .from('places')
            .select('id, name, type, google_maps_url, phone, instagram, website, notes, created_at, updated_at')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
    }

    static async createPlace(fields) {
        const { data, error } = await insforge.database
            .from('places')
            .insert([fields])
            .select()
        if (error) throw error
        return data[0]
    }

    static async updatePlace(id, fields) {
        const { data, error } = await insforge.database
            .from('places')
            .update(fields)
            .eq('id', id)
            .select()
        if (error) throw error
        return data[0]
    }

    static async deletePlace(id) {
        const { error } = await insforge.database
            .from('places')
            .delete()
            .eq('id', id)
        if (error) throw error
    }

    // ── Place Items ───────────────────────────────────────────────────────────

    static async getPlaceItems(placeId) {
        const { data, error } = await insforge.database
            .from('place_items')
            .select('id, name, price, notes, visited_date, created_at')
            .eq('place_id', placeId)
            .order('visited_date', { ascending: false })
        if (error) throw error
        return data || []
    }

    static async createPlaceItem(fields) {
        const { data, error } = await insforge.database
            .from('place_items')
            .insert([fields])
            .select()
        if (error) throw error
        return data[0]
    }

    static async updatePlaceItem(id, fields) {
        const { data, error } = await insforge.database
            .from('place_items')
            .update(fields)
            .eq('id', id)
            .select()
        if (error) throw error
        return data[0]
    }

    static async deletePlaceItem(id) {
        const { error } = await insforge.database
            .from('place_items')
            .delete()
            .eq('id', id)
        if (error) throw error
    }
}
